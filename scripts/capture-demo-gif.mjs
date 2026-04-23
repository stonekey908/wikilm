// Scripted tour of the `product-ownership` wiki, captured as a GIF for the
// README and articles. Uses puppeteer-core (vendored) to drive a real Chrome,
// seeds the active project via localStorage before navigation, walks every
// page type, and stitches the frames with ffmpeg-static.
//
// Usage (dev server running on :3000):
//   node scripts/capture-demo-gif.mjs
// Output:
//   docs/demo.gif
//
// Tuning knobs are at the top of the file — FPS, size, frames-per-scene.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Resolve both deps out of app/node_modules so this script works whether it's
// invoked from the repo root or anywhere else — there's no package.json at
// the repo root, so a bare `import 'puppeteer-core'` wouldn't resolve.
const puppeteer = (
  await import(
    path.join(
      repoRoot,
      "app",
      "node_modules",
      "puppeteer-core",
      "lib",
      "esm",
      "puppeteer",
      "puppeteer-core.js"
    )
  )
).default;
const ffmpegPath = (
  await import(path.join(repoRoot, "app", "node_modules", "ffmpeg-static", "index.js"))
).default;
const framesDir = path.join(repoRoot, "docs", ".demo-frames");
const outFile = path.join(repoRoot, "docs", "demo.gif");
const paletteFile = path.join(framesDir, "palette.png");

// ── Tuning ─────────────────────────────────────────────────────────
const FPS = 12;
const VIEWPORT = { width: 1280, height: 780, deviceScaleFactor: 1 };
const BASE = "http://localhost:3000";
const PROJECT_SLUG = "product-ownership";
// Slugs that should exist in the fixture. Resolved dynamically on first load
// so renames don't break the capture.
const WIKI_CONCEPT_FALLBACKS = [
  "concepts/agentic-product-management",
  "concepts/ai-chief-of-staff",
  "concepts/agent-ops",
];

// Number of frames per scene. 12fps × these durations:
//   Ledger         → 1.5s
//   Wiki picker    → 2.5s (scroll)
//   Wiki article   → 3s
//   Map            → 2.5s (force settle)
//   Dictation      → 2s
//   Chat           → 2s
//   Back to Ledger → 1.5s
// Total ≈ 15s.
const SCENE_FRAMES = {
  ledgerIntro: 18,
  wikiPicker: 30,
  wikiArticle: 36,
  graph: 30,
  dictation: 24,
  chat: 24,
  ledgerOutro: 18,
};

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];
const chrome = CHROME_CANDIDATES.filter(Boolean).find((p) => fs.existsSync(p));
if (!chrome) {
  console.error("No Chrome binary found.");
  process.exit(1);
}

if (!ffmpegPath) {
  console.error("ffmpeg-static didn't resolve — reinstall with `npm install`.");
  process.exit(1);
}

fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(path.dirname(outFile), { recursive: true });

async function settle(page, ms = 400) {
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise((r) => setTimeout(r, ms));
}

/** Walk a linear frame counter so scenes stitch in order. */
let frameIndex = 0;
async function snap(page) {
  const name = `frame-${String(frameIndex).padStart(5, "0")}.png`;
  frameIndex++;
  await page.screenshot({ path: path.join(framesDir, name), type: "png" });
}

async function captureStill(page, count, delayMs = 1000 / FPS) {
  for (let i = 0; i < count; i++) {
    await snap(page);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function captureScroll(page, count, totalScrollPx = 500) {
  const stepPx = totalScrollPx / count;
  for (let i = 0; i < count; i++) {
    await page.evaluate((s) => window.scrollBy(0, s), stepPx);
    await snap(page);
    await new Promise((r) => setTimeout(r, 1000 / FPS));
  }
}

/** Attempt to open a real wiki page in the active project. */
async function openFirstAvailableConcept(page) {
  for (const slug of WIKI_CONCEPT_FALLBACKS) {
    const url = `${BASE}/wiki?slug=${encodeURIComponent(slug)}`;
    const res = await page.goto(url, { waitUntil: "networkidle2" });
    if (res && res.ok()) {
      await settle(page, 600);
      // Detect the "Page not found" state — if the server returned 200 but
      // the article view didn't hydrate, bail.
      const title = await page.$("h1");
      if (title) return;
    }
  }
  // Last resort: picker view, still a good frame.
  await page.goto(`${BASE}/wiki`, { waitUntil: "networkidle2" });
  await settle(page, 600);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    defaultViewport: VIEWPORT,
    args: ["--no-sandbox", "--hide-scrollbars", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    // Seed the active project before navigation so the sidebar switcher picks
    // product-ownership on first load.
    await page.evaluateOnNewDocument((slug) => {
      try {
        localStorage.setItem("activeProject", slug);
      } catch {}
    }, PROJECT_SLUG);

    // ── Scene 1: Ledger intro ────────────────────────────────────────
    console.log("Scene 1: Ledger");
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    await settle(page, 1000);
    await captureStill(page, SCENE_FRAMES.ledgerIntro);

    // ── Scene 2: Wiki picker (with scroll) ───────────────────────────
    console.log("Scene 2: Wiki picker");
    await page.goto(`${BASE}/wiki`, { waitUntil: "networkidle2" });
    await settle(page, 700);
    await captureStill(page, 4);
    await captureScroll(page, SCENE_FRAMES.wikiPicker - 8, 800);
    // Pause at bottom
    await captureStill(page, 4);

    // ── Scene 3: Wiki article with wikilinks ─────────────────────────
    console.log("Scene 3: Wiki article");
    await openFirstAvailableConcept(page);
    await captureStill(page, Math.floor(SCENE_FRAMES.wikiArticle / 2));
    await captureScroll(page, Math.ceil(SCENE_FRAMES.wikiArticle / 2), 600);

    // ── Scene 4: Graph (force-directed) ──────────────────────────────
    console.log("Scene 4: Map");
    await page.goto(`${BASE}/graph`, { waitUntil: "networkidle2" });
    await settle(page, 1500); // let the simulation settle
    await captureStill(page, SCENE_FRAMES.graph);

    // ── Scene 5: Dictation (outputs list) ────────────────────────────
    console.log("Scene 5: Dictation");
    await page.goto(`${BASE}/compose`, { waitUntil: "networkidle2" });
    await settle(page, 700);
    await captureStill(page, Math.floor(SCENE_FRAMES.dictation / 2));
    await captureScroll(page, Math.ceil(SCENE_FRAMES.dictation / 2), 700);

    // ── Scene 6: Chat ─────────────────────────────────────────────────
    console.log("Scene 6: Chat");
    await page.goto(`${BASE}/chat`, { waitUntil: "networkidle2" });
    await settle(page, 700);
    await captureStill(page, SCENE_FRAMES.chat);

    // ── Scene 7: Ledger outro ────────────────────────────────────────
    console.log("Scene 7: Ledger outro");
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    await settle(page, 500);
    await captureStill(page, SCENE_FRAMES.ledgerOutro);
  } finally {
    await browser.close();
  }
}

/** Run ffmpeg with a promise wrapper. */
function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (c) => (stderr += c.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr}`));
    });
    proc.on("error", reject);
  });
}

async function encode() {
  const pattern = path.join(framesDir, "frame-%05d.png");

  // Two-pass palette for smaller, higher-quality GIFs — the one-liner route
  // looks muddy on editorial typography.
  console.log("Encoding palette…");
  await ffmpeg([
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-vf",
    "fps=" + FPS + ",scale=1000:-1:flags=lanczos,palettegen=max_colors=128",
    paletteFile,
  ]);

  console.log("Encoding GIF…");
  await ffmpeg([
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-i",
    paletteFile,
    "-lavfi",
    "fps=" + FPS + ",scale=1000:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3",
    outFile,
  ]);
}

async function main() {
  const t0 = Date.now();
  console.log("Capturing frames…");
  await run();
  console.log(`Captured ${frameIndex} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await encode();
  const stat = fs.statSync(outFile);
  console.log(`✓ ${outFile} — ${(stat.size / 1024).toFixed(0)} KB`);
  // Clean up frame cache — the final GIF is all we want.
  fs.rmSync(framesDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
