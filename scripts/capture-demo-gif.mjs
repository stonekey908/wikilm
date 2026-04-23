// Scripted tour of the `product-ownership` wiki, captured as a GIF for the
// README and articles.
//
// Scenes (≈ 22s at 12fps, ≈ 260 frames):
//   1  Ledger intro
//   2  Wiki article with hover preview on a wikilink
//   3  Synthesis (project overview) with scroll + hover preview
//   4  Chat — pre-seeded session showing a realistic multi-turn Q&A
//   5  Lint — findings grouped by category
//   6  Dictation — outputs list
//   7  Ledger outro
//
// Requires: dev server running on :3000, product-ownership project seeded
// with concepts + synthesis + a chat session (id resolved automatically).
//
// Usage:
//   node scripts/capture-demo-gif.mjs
// Output:
//   docs/demo.gif

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Resolve deps out of app/node_modules since there's no package.json at root.
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
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 1 };
const BASE = "http://localhost:3000";
const PROJECT_SLUG = "product-ownership";
const PROJECT_ID = 18;

const WIKI_CONCEPT_FALLBACKS = [
  "concepts/agentic-product-management",
  "concepts/ai-chief-of-staff",
  "concepts/agent-ops",
];

const SCENE_FRAMES = {
  ledgerIntro: 14,
  wikiArticle: 22,
  wikiHover: 16,
  synthesis: 24,
  synthesisHover: 16,
  chat: 40,
  lint: 30,
  dictation: 22,
  ledgerOutro: 14,
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

/**
 * Hover the nth wikilink in-article, wait for the portal-rendered preview
 * card to appear, hold, then capture frames with the card visible. Moves the
 * mouse off at the end to dismiss cleanly.
 */
async function captureWikilinkHover(page, count, nth = 2) {
  // Give the page a tick so fonts/layout have settled.
  await settle(page, 200);
  const handle = await page.evaluateHandle((n) => {
    const links = document.querySelectorAll("a.wikilink");
    return links[n] ?? links[0] ?? null;
  }, nth);
  const element = handle.asElement();
  if (!element) {
    // No wikilinks — just hold the frame.
    await captureStill(page, count);
    await handle.dispose();
    return;
  }
  // Scroll the wikilink into view so its preview card renders within the
  // viewport.
  await element.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await new Promise((r) => setTimeout(r, 250));
  await element.hover();
  // Preview card has a 160ms reveal transition; give it time to open.
  await new Promise((r) => setTimeout(r, 350));
  await captureStill(page, count);
  // Dismiss by moving the mouse to the top-left so the next scene starts clean.
  await page.mouse.move(4, 4);
  await handle.dispose();
}

async function openFirstAvailableConcept(page) {
  for (const slug of WIKI_CONCEPT_FALLBACKS) {
    const url = `${BASE}/wiki?slug=${encodeURIComponent(slug)}`;
    const res = await page.goto(url, { waitUntil: "networkidle2" });
    if (res && res.ok()) {
      await settle(page, 500);
      const title = await page.$("h1");
      if (title) return;
    }
  }
  await page.goto(`${BASE}/wiki`, { waitUntil: "networkidle2" });
  await settle(page, 500);
}

async function openMostRecentChatSession(page) {
  const sessions = await page.evaluate(async (projectId) => {
    try {
      const res = await fetch(`/api/chat/sessions?projectId=${projectId}`);
      if (!res.ok) return [];
      const d = await res.json();
      return d.sessions ?? [];
    } catch {
      return [];
    }
  }, PROJECT_ID);
  // Pick the longest session (most messages) so the scroll has real content.
  let target = null;
  if (Array.isArray(sessions) && sessions.length) {
    target = sessions.reduce((a, b) => ((b?.messageCount ?? 0) > (a?.messageCount ?? 0) ? b : a));
  }
  if (target?.id) {
    await page.goto(`${BASE}/chat?session=${target.id}`, { waitUntil: "networkidle2" });
  } else {
    await page.goto(`${BASE}/chat`, { waitUntil: "networkidle2" });
  }
  await settle(page, 800);
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
    await page.evaluateOnNewDocument((slug) => {
      try {
        localStorage.setItem("activeProject", slug);
      } catch {}
    }, PROJECT_SLUG);

    // Scene 1 — Ledger intro
    console.log("Scene 1: Ledger");
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    await settle(page, 1000);
    await captureStill(page, SCENE_FRAMES.ledgerIntro);

    // Scene 2 — Wiki article page (scroll a little to show margin cards)
    console.log("Scene 2: Wiki article");
    await openFirstAvailableConcept(page);
    await captureStill(page, 6);
    await captureScroll(page, SCENE_FRAMES.wikiArticle - 6, 500);

    // Scene 3 — Hover a wikilink to show the portal preview card
    console.log("Scene 3: Wikilink hover preview");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await settle(page, 300);
    await captureWikilinkHover(page, SCENE_FRAMES.wikiHover, 2);

    // Scene 4 — Synthesis page (project overview)
    console.log("Scene 4: Synthesis");
    await page.goto(`${BASE}/wiki?slug=${encodeURIComponent("synthesis/project-overview")}`, {
      waitUntil: "networkidle2",
    });
    await settle(page, 700);
    await captureStill(page, 6);
    await captureScroll(page, SCENE_FRAMES.synthesis - 6, 650);

    // Scene 5 — Hover wikilink on synthesis
    console.log("Scene 5: Synthesis hover");
    await page.evaluate(() => window.scrollTo({ top: 240, behavior: "instant" }));
    await settle(page, 250);
    await captureWikilinkHover(page, SCENE_FRAMES.synthesisHover, 1);

    // Scene 6 — Chat (pre-seeded session)
    console.log("Scene 6: Chat");
    await openMostRecentChatSession(page);
    // Ensure we start near the top of the thread for readable scroll.
    await page.evaluate(() => {
      const log = document.querySelector(".salon-log, .chat-log, [class*='salon']");
      if (log && typeof log.scrollTo === "function") {
        log.scrollTo({ top: 0, behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    });
    await settle(page, 300);
    await captureStill(page, 10);
    // Scroll the chat — try the container first, fall back to window.
    const chatHalf = Math.floor((SCENE_FRAMES.chat - 10) / 2);
    for (let i = 0; i < chatHalf; i++) {
      await page.evaluate(() => {
        const log = document.querySelector(".salon-log, .chat-log, [class*='salon']");
        if (log && typeof log.scrollBy === "function") log.scrollBy(0, 120);
        else window.scrollBy(0, 120);
      });
      await snap(page);
      await new Promise((r) => setTimeout(r, 1000 / FPS));
    }
    await captureStill(page, SCENE_FRAMES.chat - 10 - chatHalf);

    // Scene 7 — Lint page
    console.log("Scene 7: Lint");
    await page.goto(`${BASE}/lint`, { waitUntil: "networkidle2" });
    await settle(page, 700);
    await captureStill(page, 10);
    await captureScroll(page, SCENE_FRAMES.lint - 10, 600);

    // Scene 8 — Dictation with outputs list
    console.log("Scene 8: Dictation");
    await page.goto(`${BASE}/compose`, { waitUntil: "networkidle2" });
    await settle(page, 700);
    await captureStill(page, 10);
    await captureScroll(page, SCENE_FRAMES.dictation - 10, 600);

    // Scene 9 — Back to Ledger
    console.log("Scene 9: Ledger outro");
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
    await settle(page, 500);
    await captureStill(page, SCENE_FRAMES.ledgerOutro);
  } finally {
    await browser.close();
  }
}

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
    "fps=" +
      FPS +
      ",scale=1000:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3",
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
  fs.rmSync(framesDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
