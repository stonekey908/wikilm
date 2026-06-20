import { NextRequest } from "next/server";
import { checkWriteToken } from "@/lib/write-guard";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getProject, projectRoot, ensureOutputsDir } from "@/lib/projects";
import { startJob, getModel } from "@/lib/claude-runner";
import {
  getOutputType,
  buildOutputBaseSlug,
  outputAbsPath,
  outputRelPath,
  type OutputScope,
  type OutputTypeId,
} from "@/lib/output-types";
import { markdownToDocxBuffer } from "@/lib/export-docx";
import { parseFrontmatter } from "@/lib/wiki-utils";

const execFileAsync = promisify(execFile);

/**
 * POST /api/projects/:id/outputs/generate
 *
 * Body: { type: OutputTypeId, scope: "project" | "subtree", nudge?: string }
 *
 * Queues a job that spawns a Claude subprocess with a type-specific prompt.
 * The subprocess writes the primary artifact (md or html) to wiki/outputs/.
 * An onComplete hook runs post-processing per type:
 *   - report/cheat/summary → .md stays, .docx added via markdownToDocxBuffer
 *   - deck                → .md stays, .pdf + .pptx produced via Marp CLI (slice 3)
 *   - infographic         → .html stays, .png produced via Playwright (slice 4)
 *
 * Returns { jobId, baseSlug } immediately. Clients poll /api/claude/job/:id.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = checkWriteToken(request);
  if (denied) return denied;
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  const project = getProject(projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const typeId = typeof body?.type === "string" ? body.type : "";
  const scope: OutputScope = body?.scope === "subtree" ? "subtree" : "project";
  const nudge =
    typeof body?.nudge === "string" && body.nudge.trim().length > 0
      ? body.nudge.trim()
      : undefined;

  const def = getOutputType(typeId);
  if (!def) {
    return Response.json(
      { error: `Unknown or unavailable output type: "${typeId}"` },
      { status: 400 }
    );
  }

  // Ensure wiki/outputs/ exists on disk — pre-STO-1766 projects didn't
  // scaffold it, so first generation needs this lazy mkdir.
  ensureOutputsDir(project);

  const baseSlug = buildOutputBaseSlug(def.id, scope, nudge);
  const primaryRelPath = outputRelPath(baseSlug, def.primaryExt);
  const primaryAbsPath = outputAbsPath(project, baseSlug, def.primaryExt);
  // Resolve the model *before* spawning so the same string lands in three
  // places: the job row (via claude-runner), the prompt (so Claude writes
  // `model: ...` into the artifact's frontmatter), and the post-hooks
  // below (for the infographic companion stub).
  const model = getModel("output");

  const prompt = def.buildPrompt({
    project,
    scope,
    nudge,
    outputRelPath: primaryRelPath,
    model,
  });

  const cwd = projectRoot(project);

  const jobId = await startJob({
    prompt,
    projectCwd: cwd,
    projectId: project.id,
    type: "output",
    title: `Generate ${def.label}${scope === "subtree" ? " (subtree)" : ""}`,
    onComplete: async (status) => {
      if (status !== "completed") return;
      try {
        await runPostJobHook(
          def.id as OutputTypeId,
          primaryAbsPath,
          project.name,
          model
        );
      } catch (err) {
        console.error(
          `[outputs] post-job hook failed for ${def.id} (${primaryAbsPath}):`,
          err
        );
      }
    },
  });

  return Response.json(
    {
      jobId,
      baseSlug,
      primaryPath: primaryRelPath,
      type: def.id,
      scope,
    },
    { status: 201 }
  );
}

/**
 * Convert the primary artifact into its derived formats.
 * Runs after the Claude subprocess closes successfully.
 *
 * Report/Cheat/Summary: strip frontmatter + title-line, hand body to docx.
 * Deck / Infographic: filled in by slices 3-4.
 */
async function runPostJobHook(
  typeId: OutputTypeId,
  primaryAbsPath: string,
  projectName: string,
  model: string
): Promise<void> {
  if (!fs.existsSync(primaryAbsPath)) {
    console.error(`[outputs] primary artifact missing: ${primaryAbsPath}`);
    return;
  }

  if (typeId === "report" || typeId === "cheat" || typeId === "summary") {
    const raw = fs.readFileSync(primaryAbsPath, "utf-8");
    const { body, meta } = parseFrontmatter(raw);
    const titleFromMeta =
      typeof meta.title === "string" && meta.title.length > 0
        ? meta.title
        : `${projectName} — ${typeId}`;
    // Same treatment as the deck: in an exported Word doc, a reader can't
    // chase a wikilink — rendering them as bare `entities/alibaba-qwen`
    // underlined text just adds visual noise. Humanize to the last path
    // segment so the reference still reads naturally.
    const buffer = await markdownToDocxBuffer(
      humanizeWikilinks(body),
      titleFromMeta
    );
    const docxPath = primaryAbsPath.replace(/\.md$/, ".docx");
    fs.writeFileSync(docxPath, buffer);
    return;
  }

  if (typeId === "infographic") {
    await renderInfographicPng(primaryAbsPath);
    // Companion .md so the infographic appears in the wiki list + graph under
    // `type: output`. Walker is markdown-only — an .html file alone would be
    // invisible to /api/wiki.
    const stubPath = primaryAbsPath.replace(/\.html$/, ".md");
    const fileBase = path.basename(primaryAbsPath, ".html");
    const stub = [
      "---",
      "type: output",
      "output_type: infographic",
      `generated_at: "${new Date().toISOString().slice(0, 10)}"`,
      `model: "${model}"`,
      "tags: [output, infographic]",
      `title: "Infographic — ${fileBase}"`,
      "---",
      "",
      `# Infographic — ${fileBase}`,
      "",
      `This output is a visual HTML / PNG artifact. Open the HTML for the interactive version, or the PNG for a flat image.`,
      "",
      "## Files",
      "",
      `- \`outputs/${fileBase}.html\` — single-page HTML (self-contained, inline CSS/SVG)`,
      `- \`outputs/${fileBase}.png\` — flat PNG rendering`,
      "",
    ].join("\n");
    fs.writeFileSync(stubPath, stub);
    return;
  }

  if (typeId === "deck") {
    // Marp CLI renders each format in a separate invocation so a PPTX
    // failure doesn't prevent the PDF landing (and vice versa).
    // `--no-stdin` is CRITICAL — without it Marp defaults to reading stdin
    // for markdown input when not run from a TTY, and hangs forever in a
    // background hook that has no stdin attached.
    const marpBin = path.join(process.cwd(), "node_modules", ".bin", "marp");
    const pdfPath = primaryAbsPath.replace(/\.md$/, ".pdf");
    const pptxPath = primaryAbsPath.replace(/\.md$/, ".pptx");
    // Preprocess: strip `[[wikilinks]]` to human-readable form before Marp
    // sees it. Marp doesn't know about wikilinks, so without this the deck
    // renders raw `[[entities/deepseek]]` brackets in the credit lines.
    // Keep the authored .md intact so WikiLM's own viewer still sees
    // clickable links — we only preprocess the copy Marp reads.
    const raw = fs.readFileSync(primaryAbsPath, "utf-8");
    const marpSource = humanizeWikilinks(raw);
    const marpSourcePath = `${primaryAbsPath}.marp.md`;
    fs.writeFileSync(marpSourcePath, marpSource);
    try {
      const commonArgs = [
        marpSourcePath,
        "--no-stdin",
        "--allow-local-files",
      ];
      const results = await Promise.allSettled([
        execFileAsync(marpBin, [...commonArgs, "--pdf", "-o", pdfPath], {
          timeout: 60_000,
        }),
        execFileAsync(marpBin, [...commonArgs, "--pptx", "-o", pptxPath], {
          timeout: 60_000,
        }),
      ]);
      results.forEach((r, i) => {
        const fmt = i === 0 ? "pdf" : "pptx";
        if (r.status === "rejected") {
          console.error(`[outputs] marp ${fmt} render failed:`, r.reason);
        }
      });
    } finally {
      try {
        fs.unlinkSync(marpSourcePath);
      } catch {
        // best-effort cleanup
      }
    }
    return;
  }

}

/**
 * Locate a Chrome / Chromium binary for headless HTML → PNG rendering.
 *
 * Order of preference:
 *   1. PUPPETEER_EXECUTABLE_PATH env var (ops override)
 *   2. Common system install paths (macOS → Linux)
 *   3. Return null — caller logs + skips PNG rendering
 *
 * Keeping this discovery out-of-band avoids adding a 200 MB Chromium download
 * as a hard dependency. Most dev + server environments already have Chrome.
 */
function findChromeExecutable(): string | null {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Convert `[[wikilinks]]` to human-readable phrases for export destinations
 * (Marp decks, Word docx) that can't chase wiki links anyway:
 *   `[[concepts/mixture-of-experts]]` → `mixture of experts`
 *   `[[entities/deepseek]], [[entities/alibaba-qwen]]` → `deepseek, alibaba qwen`
 *
 * We only preprocess the copy the exporter reads — the authored `.md` stays
 * intact so WikiLM's own viewer keeps the clickable links.
 */
function humanizeWikilinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_, inner: string) => {
    const last = inner.split("/").pop() ?? inner;
    return last.replace(/-/g, " ");
  });
}

async function renderInfographicPng(htmlAbsPath: string): Promise<void> {
  const pngPath = htmlAbsPath.replace(/\.html$/, ".png");
  const executablePath = findChromeExecutable();
  if (!executablePath) {
    console.error(
      "[outputs] no Chrome/Chromium binary found — skipping PNG render. " +
        "Set PUPPETEER_EXECUTABLE_PATH to enable."
    );
    return;
  }

  // Lazy import so puppeteer-core doesn't load on cold start of every route.
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1800, deviceScaleFactor: 2 });
    await page.goto(`file://${htmlAbsPath}`, { waitUntil: "networkidle0" });
    await page.screenshot({ path: pngPath as `${string}.png`, fullPage: true });
  } finally {
    await browser.close();
  }
}
