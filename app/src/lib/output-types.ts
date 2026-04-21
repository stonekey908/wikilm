/**
 * Registry of generated-output types for STO-1766.
 *
 * Each entry describes one type of wiki/outputs/ artifact WikiLM can produce:
 *   - id/label — stable machine id and human label
 *   - description — one-line for the UI
 *   - primary extension — the file Claude writes directly (md or html)
 *   - derived extensions — additional files produced by post-job hooks
 *     (e.g. .docx from the .md, .pdf+.pptx from a Marp .md, .png from .html)
 *   - buildPrompt(ctx) — construct the Claude prompt, given the project, scope,
 *     optional user nudge, and the relative output path Claude must write to.
 *
 * New types land here as their slice ships — keep the shape stable so the
 * endpoint + UI + MCP all stay type-safe without branching.
 */
import path from "path";
import type { Project } from "@/lib/projects";
import { listChildren, projectRoot, listDescendants } from "@/lib/projects";

export type OutputTypeId =
  | "report"
  | "cheat"
  | "summary"
  | "deck"
  | "infographic";

export type OutputScope = "project" | "subtree";

export interface BuildPromptContext {
  project: Project;
  scope: OutputScope;
  nudge?: string;
  /** Output path relative to the project's cwd (e.g. "wiki/outputs/2026-04-19-report-foo.md"). */
  outputRelPath: string;
  /** Model resolved at spawn time — logged into the artifact's frontmatter
   *  + wiki/log.md entry so the user can review later which LLM produced
   *  which output. */
  model: string;
}

export interface OutputTypeDef {
  id: OutputTypeId;
  label: string;
  description: string;
  /** Extension Claude writes directly. */
  primaryExt: "md" | "html";
  /** Extra extensions produced by the post-job hook (empty for summary). */
  derivedExts: string[];
  buildPrompt: (ctx: BuildPromptContext) => string;
}

/**
 * Absolute path on disk to ROOT (repo root). The app runs from `app/`, so
 * strip a trailing `/app` off `process.cwd()` if present.
 */
function repoRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith("/app") ? cwd.slice(0, -"/app".length) : path.join(cwd, "..");
}

/**
 * Build the "what to read" section of the prompt. In subtree scope, we pass
 * absolute paths to each descendant's synthesis so Claude doesn't have to
 * guess relative traversals from nested project cwds.
 */
function scopeContextBlock(project: Project, scope: OutputScope): string {
  const root = repoRoot();
  const lines: string[] = [];

  lines.push("Context to read BEFORE writing the output:");
  lines.push("- `wiki/index.md` (relative to cwd) — the catalog of pages in THIS project");
  lines.push(
    "- `wiki/synthesis/project-overview.md` (relative to cwd) — the always-up-to-date project overview"
  );
  lines.push(
    "- Any specific pages you need from this project's `wiki/sources/`, `wiki/entities/`, `wiki/concepts/` (relative to cwd) — cite them"
  );

  if (scope === "subtree") {
    const children = listDescendants(project);
    if (children.length > 0) {
      lines.push("");
      lines.push(
        "This is a SUBTREE-scope output — also read the synthesis of every descendant project:"
      );
      for (const c of children) {
        const absPath = path.join(
          root,
          "projects",
          c.slug,
          "wiki",
          "synthesis",
          "project-overview.md"
        );
        lines.push(`- \`${absPath}\` — absolute path, use Read tool with this exact string`);
      }
    } else {
      lines.push("");
      lines.push(
        "(Subtree scope was requested but this project has no descendants — treat this as a plain project-scope output.)"
      );
    }
  }

  // Direct children (one level) context — always useful so Claude can drop
  // cross-project `[[child/page]]` wikilinks where appropriate.
  const directChildren = listChildren(project.id);
  if (directChildren.length > 0) {
    lines.push("");
    lines.push("Direct children (use `[[<slug>/<page>]]` to cross-link into them):");
    for (const c of directChildren) {
      lines.push(`- ${c.slug}`);
    }
  }

  return lines.join("\n");
}

function frontmatterBlock(
  typeId: OutputTypeId,
  scope: OutputScope,
  project: Project,
  model: string
): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "---",
    "type: output",
    `output_type: ${typeId}`,
    `generated_at: "${today}"`,
    `scope: ${scope}`,
    `project_slug: "${project.slug}"`,
    `model: "${model}"`,
    "tags: [output, " + typeId + "]",
  ];
  // Decks need a `marp: true` directive so the Marp CLI recognises the file.
  // We keep it alongside our own fields — Marp ignores unknown keys, and our
  // wiki parser ignores `marp`, `theme`, and `paginate`.
  if (typeId === "deck") {
    lines.push("marp: true");
    lines.push("theme: default");
    lines.push("paginate: true");
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function nudgeBlock(nudge?: string): string {
  if (!nudge || !nudge.trim()) return "";
  return `\nUSER FOCUS (honor this throughout):\n"""\n${nudge.trim()}\n"""\n`;
}

// ─── Type definitions ────────────────────────────────────────────────────────

const REPORT: OutputTypeDef = {
  id: "report",
  label: "Report",
  description:
    "Structured markdown document — Executive summary, Findings, Evidence, Gaps, Next steps. Exports .md + .docx.",
  primaryExt: "md",
  derivedExts: ["docx"],
  buildPrompt: (ctx) => {
    const { project, scope, nudge, outputRelPath, model } = ctx;
    return `Generate a **structured REPORT** from this WikiLM project's wiki content and write it to \`${outputRelPath}\`.

${scopeContextBlock(project, scope)}
${nudgeBlock(nudge)}
Required structure (exactly these section headings, in this order):

# <Report title — concrete and specific, not "Report on X">

## Executive summary
One paragraph. The single most important thing a reader should walk away with.

## Findings
Numbered list of 5–10 substantive findings. Each is one sentence of assertion plus 1–2 sentences of elaboration. Link supporting evidence with [[wikilinks]] inline.

## Evidence
For each finding above, a short subsection keyed by the finding number. Quote or paraphrase specific sources using [[source/...]] wikilinks. Cite concept and entity pages too.

## Gaps
Bulleted list of what the wiki cannot yet answer — specific, testable gaps, not generic "we need more research".

## Next steps
Bulleted list of concrete actions: sources to find, concepts to draft, comparisons to write, questions to investigate.

Quality bar:
- Every substantive claim should be backed by a [[wikilink]] to a source, entity, or concept page in this project (or cross-project in subtree mode).
- Prefer specific facts over generalities.
- The report should stand on its own — a reader who has never seen the wiki should come away informed.
- Target length: 800–1500 words of body.

File requirements:
- Start the file with YAML frontmatter:
\`\`\`
${frontmatterBlock("report", scope, project, model).trim()}
\`\`\`
- Then the markdown body in the structure above.
- Write ONLY to \`${outputRelPath}\` — do not create other files, do not modify existing wiki pages.

After writing, append a one-line entry to \`wiki/log.md\` (relative to cwd): \`## [${new Date()
      .toISOString()
      .slice(0, 10)}] update | Generated output: report (${scope}) | model: ${model}\``;
  },
};

const CHEAT: OutputTypeDef = {
  id: "cheat",
  label: "Cheat sheet",
  description:
    "Dense 1-pager — the top facts, key quotes, and links in a single at-a-glance layout. Exports .md + .docx.",
  primaryExt: "md",
  derivedExts: ["docx"],
  buildPrompt: (ctx) => {
    const { project, scope, nudge, outputRelPath, model } = ctx;
    return `Generate a **CHEAT SHEET** from this WikiLM project's wiki content and write it to \`${outputRelPath}\`.

${scopeContextBlock(project, scope)}
${nudgeBlock(nudge)}
Required structure:

# <Cheat sheet title — the subject, not "Cheat sheet on X">

**One-line summary**: a single sentence capturing the topic.

## Key facts
- 6–10 terse bullet points. Each one specific, citable, and useful at a glance.
- Link the evidence with [[wikilinks]].

## Top quotes
Three to five verbatim quotes (marked with quotation marks) from [[source/...]] pages, each followed by the source wikilink.

## Core terms
Bulleted glossary of 5–8 terms the reader must know. Each term links to its [[concept/...]] or [[entities/...]] page when one exists.

## Who's who
3–5 key people, orgs, or products the reader should recognise, linked to their [[entities/...]] pages.

## What NOT to confuse
2–3 common mistakes, misconceptions, or look-alikes worth flagging.

## Links
- [[...]] bulleted references to the most relevant wiki pages a reader should open next.

Quality bar:
- Dense. A reader should be able to take the whole page in in 60 seconds.
- Heavy on concrete facts, names, dates, numbers, specific terminology.
- Every section is a scannable list — no paragraphs longer than 2 sentences.
- Target length: 400–700 words of body.

File requirements:
- Start the file with YAML frontmatter:
\`\`\`
${frontmatterBlock("cheat", scope, project, model).trim()}
\`\`\`
- Then the markdown body in the structure above.
- Write ONLY to \`${outputRelPath}\`.

After writing, append a one-line entry to \`wiki/log.md\` (relative to cwd): \`## [${new Date()
      .toISOString()
      .slice(0, 10)}] update | Generated output: cheat (${scope}) | model: ${model}\``;
  },
};

const SUMMARY: OutputTypeDef = {
  id: "summary",
  label: "Executive summary",
  description:
    "500-word plain-English brief. A single, tight narrative — no headings. Exports .md + .docx.",
  primaryExt: "md",
  derivedExts: ["docx"],
  buildPrompt: (ctx) => {
    const { project, scope, nudge, outputRelPath, model } = ctx;
    return `Generate an **EXECUTIVE SUMMARY** from this WikiLM project's wiki content and write it to \`${outputRelPath}\`.

${scopeContextBlock(project, scope)}
${nudgeBlock(nudge)}
Required structure:

# <Summary title — concrete, not "Executive summary">

A single, flowing narrative of 4–6 paragraphs totaling approximately 500 words (450–550 is the target range). NO subheadings, NO bullet lists — this is a continuous brief.

Open with the one most important takeaway. Middle paragraphs cover supporting findings, the strongest evidence, and the most important caveat or open question. Close with the single most useful next step.

Voice: plain-English, authoritative, no marketing hedges. A non-expert should be able to read it start to finish in under 3 minutes. Technical terms are okay when unavoidable but define them in-line on first use.

Cite specific sources, entities, and concepts with [[wikilinks]] throughout — a reader should be able to drill into any claim by following a link.

Quality bar:
- Every paragraph should carry new information; no padding.
- No headings. No lists. No tables. Pure prose.
- Every strong claim is wikilink-backed.
- Hard budget: ≤ 600 words in the body.

File requirements:
- Start the file with YAML frontmatter:
\`\`\`
${frontmatterBlock("summary", scope, project, model).trim()}
\`\`\`
- Then the markdown body (one title heading + flowing paragraphs).
- Write ONLY to \`${outputRelPath}\`.

After writing, append a one-line entry to \`wiki/log.md\` (relative to cwd): \`## [${new Date()
      .toISOString()
      .slice(0, 10)}] update | Generated output: summary (${scope}) | model: ${model}\``;
  },
};

const DECK: OutputTypeDef = {
  id: "deck",
  label: "Briefing deck",
  description:
    "6–12 Marp slides. Exports .md (Marp format) + .pdf + .pptx.",
  primaryExt: "md",
  derivedExts: ["pdf", "pptx"],
  buildPrompt: (ctx) => {
    const { project, scope, nudge, outputRelPath, model } = ctx;
    return `Generate a **BRIEFING DECK** (Marp markdown) from this WikiLM project's wiki content and write it to \`${outputRelPath}\`.

${scopeContextBlock(project, scope)}
${nudgeBlock(nudge)}
This file will be rendered by Marp CLI into .pdf and .pptx. You MUST follow Marp's conventions:
- Slides are separated by a line containing only \`---\`.
- Keep each slide LIGHT on text — short headings, tight bullets. No walls of prose.
- The first slide is a title slide.
- 6–12 slides total including the title and the closing slide.

**Marp styling — MANDATORY.** The deck MUST look designed. Replace the
project frontmatter below with a Marp-enabled YAML header that includes a
theme AND a custom style block. Use this template verbatim at the top of
the file (before any slides):

\`\`\`
---
marp: true
theme: gaia
paginate: true
backgroundColor: '#0f0e0c'
color: '#f5f0e6'
style: |
  section {
    font-family: 'Georgia', 'Fraunces', serif;
    background: linear-gradient(135deg, #0f0e0c 0%, #1a1815 60%, #2a2420 100%);
    padding: 72px 88px;
  }
  section.lead {
    background: linear-gradient(135deg, #b91c1c 0%, #0f0e0c 100%);
    text-align: left;
  }
  h1 { font-size: 64px; font-weight: 300; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 28px; }
  h2 { font-size: 42px; font-weight: 400; letter-spacing: -0.02em; border-left: 4px solid #b91c1c; padding-left: 22px; margin-bottom: 24px; }
  h3 { font-size: 26px; color: #d4c59a; font-style: italic; }
  p, li { font-size: 26px; line-height: 1.5; }
  li { margin-bottom: 8px; }
  em { color: #f7e98c; font-style: italic; }
  strong { color: #f5f0e6; font-weight: 600; }
  code { background: rgba(245,240,230,0.12); padding: 2px 8px; }
  footer { color: #8a8377; font-size: 16px; letter-spacing: 0.08em; text-transform: uppercase; }
  section::after { color: #8a8377; }
  .kicker { display: block; font-size: 18px; letter-spacing: 0.18em; text-transform: uppercase; color: #d4c59a; margin-bottom: 16px; }
header: ''
footer: 'WikiLM · ${project.slug}'
output_type: deck
scope: ${scope}
project_slug: ${project.slug}
model: ${model}
generated_at: '${new Date().toISOString()}'
---
\`\`\`

Make the title slide use Marp's \`<!-- _class: lead -->\` directive on its
first line so it picks up the red-gradient background. Every content slide
opens with an \`<p class="kicker">\` dateline (e.g. "§ 03 · Methodology").

When a slide needs a diagram, timeline, or comparison, render it as inline
SVG: \`<svg viewBox="0 0 800 260" width="100%"><!-- strokes in palette --></svg>\`.
Palette: #b91c1c (red), #d4c59a (gold), #f7e98c (highlight), #8a8377 (mute),
#f5f0e6 (paper). Do NOT embed external image URLs.

Required sequence:

Slide 1 — **Title slide**: the deck title + a one-line subtitle.

Slide 2 — **One-slide summary**: 3–5 bullets that capture the whole story.

Slides 3 through N − 1 — **Content slides**: each covers exactly one point. Pattern per slide:
- H2 heading naming the point
- 2–4 supporting bullets, each short (10–15 words)
- A final line in italics crediting the supporting [[wikilink]] page

Slide N − 1 — **What's next**: a "next steps" or "open questions" slide with 3–5 bullets.

Slide N — **Closing**: a one-line takeaway the audience should walk away with, plus a link back to the project synthesis page as a reference.

Quality bar:
- Prefer concrete nouns over abstractions. Every slide carries a specific claim, not a generic heading.
- Every content slide has at least one [[wikilink]] credit line so the deck is traceable.
- Tables allowed for comparisons. Inline SVG encouraged for any diagram or flow.
- Marp will wrap long lines ugly — keep bullets to one visual line each.
- Use **bold** sparingly for emphasis; *italic* for accents; h3 sub-headings render as gold italic.

File requirements:
- Use the themed YAML header above as the single frontmatter block (do not add a second frontmatter).
- Then the slides, separated by \`---\` on its own line between each.
- Write ONLY to \`${outputRelPath}\`.

After writing, append a one-line entry to \`wiki/log.md\` (relative to cwd): \`## [${new Date()
      .toISOString()
      .slice(0, 10)}] update | Generated output: deck (${scope}) | model: ${model}\``;
  },
};

const INFOGRAPHIC: OutputTypeDef = {
  id: "infographic",
  label: "Infographic",
  description:
    "Single self-contained HTML page — key stats, a diagram, inline CSS. Exports .html + .png.",
  primaryExt: "html",
  derivedExts: ["png"],
  buildPrompt: (ctx) => {
    const { project, scope, nudge, outputRelPath, model } = ctx;
    // Infographic uses an HTML comment to carry WikiLM metadata — frontmatter
    // YAML has no place in an HTML document. We mirror the same fields so the
    // wiki page walker can still recognise the file if it's ever read as text.
    const today = new Date().toISOString().slice(0, 10);
    return `Generate an **INFOGRAPHIC** as a single self-contained HTML file from this WikiLM project's wiki content and write it to \`${outputRelPath}\`.

${scopeContextBlock(project, scope)}
${nudgeBlock(nudge)}
Output format requirements:
- A complete HTML document (<!DOCTYPE html>, <html>, <head>, <body>).
- All CSS inline in a single <style> block in <head>. No external stylesheets.
- All SVG / icons inline. NO external images, NO remote asset URLs.
- Fixed canvas size of 1200×1800 pixels (portrait). Set \`body { width: 1200px; min-height: 1800px; margin: 0; }\`.
- Use a modern sans-serif system font stack. Use a restrained palette — 3 accent colours max.
- Include a <meta name="wikilm" content='...json...'> tag in <head> with JSON containing: output_type, scope, project_slug, generated_at ("${today}"), model ("${model}"), nudge (the user's focus, or null).

Required layout (top to bottom):
1. **Title band** (~150px tall): headline + one-line subtitle.
2. **Top-line stats** (~220px tall): 3–5 big-number stats in a row. Each has a value, a short label, and a small source attribution in muted text.
3. **Main diagram** (~600px tall): an inline SVG that visualises the central relationship — a flow, a timeline, a hierarchy, or a comparison. Pick the shape that fits the content, don't force a template.
4. **Supporting callouts** (~500px tall): 3–6 short, sourced insights laid out as cards. Each card has a tight heading, one paragraph of 30–50 words, and a source attribution ("From [[source/...]]" rendered as plain text).
5. **Footer** (~80px tall): "Generated by WikiLM" + project slug + date.

Source discipline:
- Every specific claim comes from a real wiki page you read. Quote numbers, names, and terminology verbatim from those sources.
- In the \`<meta>\` tag AND in the footer, include a list of the source slugs you drew from.
- Do NOT invent data points or statistics that aren't in the wiki.

Quality bar:
- Visual hierarchy: the reader's eye should move title → stats → diagram → callouts → footer without help.
- Every colour serves a purpose. No decorative filler.
- Typography: ≤ 3 text sizes total. Numbers large, labels small, body readable.
- Keep the whole HTML file under 80 KB uncompressed — no embedded base64 images.

File requirements:
- Write ONLY to \`${outputRelPath}\`.
- Do NOT create any other files.

After writing, append a one-line entry to \`wiki/log.md\` (relative to cwd): \`## [${today}] update | Generated output: infographic (${scope}) | model: ${model}\``;
  },
};

export const OUTPUT_TYPES: Record<OutputTypeId, OutputTypeDef> = {
  report: REPORT,
  cheat: CHEAT,
  summary: SUMMARY,
  deck: DECK,
  infographic: INFOGRAPHIC,
};

/** Enabled output types — UI + endpoint both derive from this. */
export function enabledOutputTypes(): OutputTypeDef[] {
  return Object.values(OUTPUT_TYPES).filter((t): t is OutputTypeDef => t != null);
}

export function getOutputType(id: string): OutputTypeDef | null {
  const def = OUTPUT_TYPES[id as OutputTypeId];
  return def ?? null;
}

/** Slugify the optional nudge into a filename-safe fragment. */
export function nudgeSlug(nudge?: string): string {
  if (!nudge) return "";
  return (
    nudge
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || ""
  );
}

/** Build the base slug (no extension) for a new output file.
 *
 * Includes HHmm so same-day regenerations never overwrite previous ones —
 * users were surprised when regenerating silently replaced their earlier
 * artifact. If they want to purge the old one, the trash icon handles it. */
export function buildOutputBaseSlug(
  typeId: OutputTypeId,
  scope: OutputScope,
  nudge?: string
): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hhmm = now.toISOString().slice(11, 16).replace(":", "");
  const tail = nudgeSlug(nudge);
  const scopeTag = scope === "subtree" ? "-subtree" : "";
  return tail
    ? `${date}-${hhmm}-${typeId}${scopeTag}-${tail}`
    : `${date}-${hhmm}-${typeId}${scopeTag}`;
}

/** Absolute path under wiki/outputs for a given base slug + extension. */
export function outputAbsPath(
  project: Project,
  baseSlug: string,
  ext: string
): string {
  return path.join(projectRoot(project), "wiki", "outputs", `${baseSlug}.${ext}`);
}

/** Project-cwd-relative path (suitable for the prompt). */
export function outputRelPath(baseSlug: string, ext: string): string {
  return `wiki/outputs/${baseSlug}.${ext}`;
}
