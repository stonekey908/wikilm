import { db } from "@/db";
import { jobs, lintFindings } from "@/db/schema";
import { and, eq, inArray, ne } from "drizzle-orm";
import { startJob, triggerSynthesisUpdate } from "@/lib/claude-runner";

export const FIXABLE_CATEGORIES = new Set([
  "orphan",
  "missing_concept",
  "missing_cross_ref",
  "stale_claim",
  "contradiction",
]);

const LINT_CATEGORIES = [
  "orphan",
  "missing_concept",
  "contradiction",
  "stale_claim",
  "missing_cross_ref",
  "suggested_question",
] as const;

// Parent-level lint emits a different category set — these don't apply to
// single-project lint runs and vice versa. Keeping them separate avoids the
// project lint prompt accidentally filing a "promotion_candidate" without
// the parent's cross-child context.
const PARENT_LINT_CATEGORIES = [
  "promotion_candidate",
  "recurring_theme",
  "parent_gap",
] as const;

type LintCategory = (typeof LINT_CATEGORIES)[number];
type ParentLintCategory = (typeof PARENT_LINT_CATEGORIES)[number];

interface RawFinding {
  category: string;
  severity?: string;
  title: string;
  description: string;
  target_page?: string | null;
  suggested_action?: string | null;
  dedupe_key: string;
}

const LINT_PROMPT = `Audit the wiki/ directory for health issues. This is a structured lint pass — output findings as machine-readable lines, not prose.

For each issue, emit a single line in exactly this format (one finding per line):
FINDING:{"category":"<category>","severity":"info|warn","title":"<short title>","description":"<1-2 sentence explanation>","target_page":"<wiki path or null>","suggested_action":"<what to do about it>","dedupe_key":"<stable id>"}

Categories (use exactly these values):
- orphan — a wiki page with no inbound links from any other wiki page
- missing_concept — a concept mentioned 3+ times across sources but lacking its own page in wiki/concepts/
- contradiction — two pages make claims that contradict each other
- stale_claim — a claim superseded by a newer source
- missing_cross_ref — a page should link to another existing page but doesn't
- suggested_question — a knowledge gap that would be worth investigating

Severity:
- warn — likely broken (orphans, contradictions)
- info — improvement opportunity (missing concepts, cross-refs, suggested questions)

dedupe_key — a stable identifier so the same issue isn't re-reported. Format examples:
- orphan:wiki/concepts/foo.md
- missing_concept:bar-baz
- contradiction:wiki/a.md:wiki/b.md:<topic-slug>
- stale_claim:wiki/a.md:<claim-slug>
- missing_cross_ref:wiki/a.md->wiki/b.md
- suggested_question:<slugified-question>

Process:
1. Read wiki/index.md to enumerate all pages.
2. For orphans: for each page, check whether any OTHER page links to it (grep for its filename / page title in [[wikilinks]]).
3. For missing_concept: scan source summaries and entity pages for terms that appear 3+ times without their own concept page.
4. For contradiction / stale_claim / missing_cross_ref: read page contents and compare.
5. Emit each finding as you discover it. Do not repeat findings.

Do NOT write any files. Do NOT modify the wiki. Only emit FINDING: lines to stdout.

When finished, output exactly: LINT_DONE`;

export function getLintPrompt(): string {
  return LINT_PROMPT;
}

/**
 * Parse FINDING:{json} lines from a lint job's stdout.
 */
export function parseLintOutput(output: string): RawFinding[] {
  const results: RawFinding[] = [];
  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("FINDING:")) continue;
    const jsonPart = line.slice("FINDING:".length).trim();
    try {
      const parsed = JSON.parse(jsonPart) as RawFinding;
      if (
        typeof parsed.category === "string" &&
        typeof parsed.title === "string" &&
        typeof parsed.description === "string" &&
        typeof parsed.dedupe_key === "string"
      ) {
        results.push(parsed);
      }
    } catch {
      // malformed line — skip
    }
  }
  return results;
}

export type LintScope = "project" | "parent";

/**
 * Persist lint findings for a project.
 * - Respects prior dismissed/resolved findings (keyed by dedupe_key): never re-opens them.
 * - Clears stale "open" findings before inserting the new run's results.
 * - Scope is either "project" (default, per-project lint) or "parent"
 *   (parent-level lint — promotion candidates, recurring themes, gaps).
 *   Scopes are cleaned and inserted independently so a parent run doesn't
 *   wipe the project-level findings, and vice versa.
 * - `allowedCategories` gates which categories count — lets the parent
 *   writer accept promotion_candidate/recurring_theme/parent_gap without
 *   those leaking into project-scoped runs.
 */
export function persistLintFindings(
  projectId: number,
  jobId: number,
  raw: RawFinding[],
  opts: { scope?: LintScope; allowedCategories?: readonly string[] } = {}
): { inserted: number; skipped: number } {
  const scope: LintScope = opts.scope ?? "project";
  const allowed = opts.allowedCategories ?? LINT_CATEGORIES;

  const nonOpen = db
    .select({ dedupeKey: lintFindings.dedupeKey })
    .from(lintFindings)
    .where(
      and(
        eq(lintFindings.projectId, projectId),
        eq(lintFindings.scope, scope),
        ne(lintFindings.status, "open")
      )
    )
    .all();
  const suppressed = new Set(nonOpen.map((r) => r.dedupeKey));

  db.delete(lintFindings)
    .where(
      and(
        eq(lintFindings.projectId, projectId),
        eq(lintFindings.scope, scope),
        eq(lintFindings.status, "open")
      )
    )
    .run();

  let inserted = 0;
  let skipped = 0;
  const seenThisRun = new Set<string>();

  for (const f of raw) {
    if (!allowed.includes(f.category)) {
      skipped++;
      continue;
    }
    if (suppressed.has(f.dedupe_key)) {
      skipped++;
      continue;
    }
    if (seenThisRun.has(f.dedupe_key)) {
      skipped++;
      continue;
    }
    seenThisRun.add(f.dedupe_key);

    db.insert(lintFindings)
      .values({
        projectId,
        jobId,
        scope,
        category: f.category,
        severity: f.severity === "warn" ? "warn" : "info",
        title: f.title.slice(0, 200),
        description: f.description,
        targetPage: f.target_page ?? null,
        suggestedAction: f.suggested_action ?? null,
        status: "open",
        dedupeKey: f.dedupe_key,
      })
      .run();
    inserted++;
  }

  return { inserted, skipped };
}

/**
 * Kick off a lint job. Parses findings on completion and persists them.
 */
export async function startLintJob(options: {
  projectCwd: string;
  projectId: number;
}): Promise<number> {
  const ref: { jobId: number } = { jobId: 0 };

  const jobId = await startJob({
    prompt: LINT_PROMPT,
    projectCwd: options.projectCwd,
    projectId: options.projectId,
    type: "lint",
    title: "Wiki health check",
    onComplete: (status) => {
      if (status !== "completed" || !ref.jobId) return;
      const row = db
        .select({ output: jobs.output })
        .from(jobs)
        .where(eq(jobs.id, ref.jobId))
        .get();
      if (!row?.output) return;
      const raw = parseLintOutput(row.output);
      persistLintFindings(options.projectId, ref.jobId, raw);
    },
  });

  ref.jobId = jobId;
  return jobId;
}

export { LINT_CATEGORIES, PARENT_LINT_CATEGORIES };
export type { LintCategory, ParentLintCategory };

// ─── Parent lint ──────────────────────────────────────────────────────────
// Parent lint looks across children's syntheses (not raw pages) to surface
// cross-cutting patterns — pages that could be promoted, themes appearing
// in multiple children, and gaps implied by children but not filled at the
// parent level. Findings are persisted with scope="parent" so they live
// alongside but apart from per-project findings.

const PARENT_LINT_PROMPT = `Audit a PARENT project and its direct children to surface cross-cutting issues. Output findings as machine-readable lines, not prose.

Inputs (read-only):
- This project's wiki/synthesis/project-overview.md (if any).
- Each direct child project's wiki/synthesis/project-overview.md. Children live at ../projects/<child-slug>/wiki/synthesis/project-overview.md relative to this project's wiki/, OR if this project is the root, at ./projects/<child-slug>/wiki/synthesis/project-overview.md.
- Each direct child project's wiki/index.md, so you know what pages each child contains.

Do NOT read children's raw/ directories. Do NOT open individual child source/entity/concept pages — only their syntheses and index files.

For each issue, emit a single line in exactly this format (one finding per line):
FINDING:{"category":"<category>","severity":"info|warn","title":"<short title>","description":"<1-2 sentence explanation>","target_page":"<wiki path or null>","suggested_action":"<what to do about it>","dedupe_key":"<stable id>"}

Categories (use exactly these values):
- promotion_candidate — a page in a child that looks cross-cutting enough to exist at the parent level (generic phrasing, not child-specific; applies to multiple siblings). target_page should be "<childSlug>:<pageSlug>" and suggested_action should explain why and where it could move.
- recurring_theme — a theme, pattern, or method appearing in 2+ children's syntheses. target_page is null; description should name the theme and the child slugs.
- parent_gap — a topic implied by 2+ children but with no concept/synthesis page at the parent level. target_page is null; suggested_action should name the concept that could be written at the parent.

Severity:
- warn — recurring_theme with high overlap (3+ children) or clearly missing structure
- info — everything else

dedupe_key — a stable identifier so the same issue isn't re-reported. Format examples:
- promotion_candidate:<childSlug>:<pageSlug>
- recurring_theme:<theme-slug>
- parent_gap:<concept-slug>

Process:
1. Read this project's wiki/index.md and wiki/synthesis/project-overview.md.
2. For each direct child, read their wiki/synthesis/project-overview.md and wiki/index.md.
3. Compare across children to find recurring themes, promotion candidates, and gaps.
4. Emit each finding as you discover it. Do not repeat findings.

Do NOT write any files. Do NOT modify any wiki.

When finished, output exactly: LINT_DONE`;

export function getParentLintPrompt(): string {
  return PARENT_LINT_PROMPT;
}

/**
 * Kick off a parent-level lint job. On completion, parses FINDING: lines
 * and persists them with scope="parent", gated to PARENT_LINT_CATEGORIES
 * so the project lint categories can't accidentally land here.
 */
export async function startParentLintJob(options: {
  projectCwd: string;
  projectId: number;
}): Promise<number> {
  const ref: { jobId: number } = { jobId: 0 };

  const jobId = await startJob({
    prompt: PARENT_LINT_PROMPT,
    projectCwd: options.projectCwd,
    projectId: options.projectId,
    type: "lint",
    title: "Parent-level wiki health check",
    onComplete: (status) => {
      if (status !== "completed" || !ref.jobId) return;
      const row = db
        .select({ output: jobs.output })
        .from(jobs)
        .where(eq(jobs.id, ref.jobId))
        .get();
      if (!row?.output) return;
      const raw = parseLintOutput(row.output);
      persistLintFindings(options.projectId, ref.jobId, raw, {
        scope: "parent",
        allowedCategories: PARENT_LINT_CATEGORIES,
      });
    },
  });

  ref.jobId = jobId;
  return jobId;
}

// ─── Fix jobs ─────────────────────────────────────────────────────────────

interface FindingRow {
  id: number;
  category: string;
  title: string;
  description: string;
  targetPage: string | null;
  suggestedAction: string | null;
}

function buildFixPrompt(findings: FindingRow[]): string {
  const header = `You are applying wiki-health fixes from a lint pass. Each finding below has an id, category, and suggested_action. Apply the appropriate change to the wiki.

Guidelines:
- Stay within wiki/ — never modify files in raw/
- Preserve YAML frontmatter on every page you edit
- Use [[wikilinks]] for internal cross-references (filename without .md, e.g. [[concept-foo]])
- If you create a new page, add an entry to wiki/index.md and append a line to wiki/log.md
- Be conservative: if a fix would require guessing or a new source, mark it UNFIXABLE rather than inventing content

Output format (one line per finding, machine-readable):
- For each finding you successfully fix:    RESOLVED:<id>
- For each finding you cannot safely fix:   UNFIXABLE:<id>:<short reason>

When every listed finding has been addressed with exactly one RESOLVED or UNFIXABLE line, output: FIX_DONE
`;

  const blocks = findings.map((f, i) => {
    const parts = [
      `[${i + 1}] id=${f.id}`,
      `    category: ${f.category}`,
      `    title: ${f.title}`,
      `    description: ${f.description}`,
    ];
    if (f.targetPage) parts.push(`    target_page: ${f.targetPage}`);
    if (f.suggestedAction) parts.push(`    suggested_action: ${f.suggestedAction}`);
    return parts.join("\n");
  });

  return `${header}\nFindings:\n${blocks.join("\n\n")}`;
}

interface FixParseResult {
  resolved: Set<number>;
  unfixable: Map<number, string>;
}

export function parseFixOutput(output: string): FixParseResult {
  const resolved = new Set<number>();
  const unfixable = new Map<number, string>();

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();

    const resolvedMatch = line.match(/^RESOLVED:(\d+)\b/);
    if (resolvedMatch) {
      resolved.add(parseInt(resolvedMatch[1], 10));
      continue;
    }

    const unfixableMatch = line.match(/^UNFIXABLE:(\d+):(.*)$/);
    if (unfixableMatch) {
      const id = parseInt(unfixableMatch[1], 10);
      const reason = unfixableMatch[2].trim();
      unfixable.set(id, reason || "Unfixable");
    }
  }

  return { resolved, unfixable };
}

/**
 * Kick off a fix job for one or more findings.
 * - Flips the findings to status='fixing' immediately.
 * - On completion: deletes RESOLVED ids; flips others back to 'open'.
 * - On job failure: flips all back to 'open'.
 */
export async function startFixJob(options: {
  findingIds: number[];
  projectCwd: string;
  projectId: number;
}): Promise<number> {
  if (options.findingIds.length === 0) {
    throw new Error("No findings to fix");
  }

  const rows = db
    .select()
    .from(lintFindings)
    .where(
      and(
        eq(lintFindings.projectId, options.projectId),
        inArray(lintFindings.id, options.findingIds)
      )
    )
    .all();

  const fixable = rows.filter((r) => FIXABLE_CATEGORIES.has(r.category));
  if (fixable.length === 0) {
    throw new Error("None of the selected findings are auto-fixable");
  }

  // Flip to 'fixing' so the UI shows a spinner and we don't double-submit
  db.update(lintFindings)
    .set({ status: "fixing", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(lintFindings.projectId, options.projectId),
        inArray(
          lintFindings.id,
          fixable.map((r) => r.id)
        )
      )
    )
    .run();

  const prompt = buildFixPrompt(
    fixable.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      targetPage: r.targetPage,
      suggestedAction: r.suggestedAction,
    }))
  );

  const title =
    fixable.length === 1
      ? `Fix: ${fixable[0].title.slice(0, 60)}`
      : `Fix ${fixable.length} findings`;

  const fixingIds = fixable.map((r) => r.id);
  const ref: { jobId: number } = { jobId: 0 };

  const jobId = await startJob({
    prompt,
    projectCwd: options.projectCwd,
    projectId: options.projectId,
    type: "fix",
    title,
    onComplete: (status) => {
      // Always re-fetch current in-flight ids in case any were already cleaned up
      const stillFixing = db
        .select({ id: lintFindings.id })
        .from(lintFindings)
        .where(
          and(
            inArray(lintFindings.id, fixingIds),
            eq(lintFindings.status, "fixing")
          )
        )
        .all()
        .map((r) => r.id);

      if (status !== "completed") {
        // Full job failure — revert any still-fixing back to open
        if (stillFixing.length > 0) {
          db.update(lintFindings)
            .set({ status: "open", updatedAt: new Date().toISOString() })
            .where(inArray(lintFindings.id, stillFixing))
            .run();
        }
        return;
      }

      if (!ref.jobId) return;
      const row = db
        .select({ output: jobs.output })
        .from(jobs)
        .where(eq(jobs.id, ref.jobId))
        .get();

      const { resolved } = parseFixOutput(row?.output ?? "");

      const toDelete = stillFixing.filter((id) => resolved.has(id));
      const toRevert = stillFixing.filter((id) => !resolved.has(id));

      if (toDelete.length > 0) {
        db.delete(lintFindings).where(inArray(lintFindings.id, toDelete)).run();
      }
      if (toRevert.length > 0) {
        db.update(lintFindings)
          .set({ status: "open", updatedAt: new Date().toISOString() })
          .where(inArray(lintFindings.id, toRevert))
          .run();
      }

      // If any findings were actually resolved, the wiki changed — refresh
      // the project synthesis. Coalescing in triggerSynthesisUpdate ensures
      // rapid fix bursts produce at most one follow-up run.
      if (toDelete.length > 0) {
        triggerSynthesisUpdate(options.projectCwd, options.projectId).catch(
          (err) => console.error("[fix] failed to trigger synthesis:", err)
        );
      }
    },
  });

  ref.jobId = jobId;
  return jobId;
}
