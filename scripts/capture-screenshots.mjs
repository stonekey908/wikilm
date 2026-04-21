// Screenshot rig for v1.5-beta README.
// Spawns headless Chromium via puppeteer-core, visits each screen, waits for
// fonts + data, and writes PNGs into docs/screenshots/.
//
// Usage: node scripts/capture-screenshots.mjs
//
// Requires: dev server running on :3000 and real content in the e2e-rag-test
// project (id=16). Uses the first available concept page for the wiki shot.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "docs", "screenshots");

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

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };
const BASE = "http://localhost:3000";
const PROJECT_ID = 16; // e2e-rag-test
const PROJECT_SLUG = "e2e-rag-test";

// Resolve a wiki slug to screenshot. Prefer the retrieval-augmented-generation
// concept since it's the hub of the e2e-rag-test graph.
const WIKI_CONCEPT_SLUG = "concepts/retrieval-augmented-generation";
const WIKI_SYNTHESIS_SLUG = "synthesis/project-overview";
// Infographic output slug (from the 2026-04-21 generation). Fall back to the
// latest output if this isn't present.
const WIKI_INFOGRAPHIC_SLUG =
  "outputs/2026-04-21-1519-infographic-end-to-end-architecture-and-tradeoffs";

async function ensureProjectSelected(page) {
  // The project-switcher stores the active project under "activeProject" as
  // a slug string. Seed it before any navigation so we don't screenshot the
  // wrong wiki.
  await page.evaluateOnNewDocument((slug) => {
    try {
      localStorage.setItem("activeProject", slug);
    } catch {}
  }, PROJECT_SLUG);
}

async function settle(page, ms = 800) {
  // Give fonts, data fetches, and any entry animations a beat to complete.
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await new Promise((r) => setTimeout(r, ms));
}

async function shot(page, filename) {
  const file = path.join(outDir, filename);
  await page.screenshot({ path: file, fullPage: false });
  const size = fs.statSync(file).size;
  console.log(`  ✓ ${filename}  (${(size / 1024).toFixed(0)} KB)`);
}

async function go(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle2", timeout: 30000 });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const puppeteer = (await import(
    path.join(repoRoot, "app", "node_modules", "puppeteer-core", "lib", "esm", "puppeteer", "puppeteer-core.js")
  )).default;

  console.log(`Chrome: ${chrome}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height} @${VIEWPORT.deviceScaleFactor}x`);
  console.log(`Project: ${PROJECT_ID}`);

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    defaultViewport: VIEWPORT,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await ensureProjectSelected(page);

  // 1. Dashboard / Ledger
  await go(page, "/");
  await settle(page);
  await shot(page, "00-dashboard.png");

  // 2. Wiki concept page (hub page, lots of wikilinks)
  await go(page, `/wiki?slug=${encodeURIComponent(WIKI_CONCEPT_SLUG)}`);
  await settle(page, 1200);
  await shot(page, "01-wiki-concept.png");

  // 3. Wiki synthesis page
  await go(page, `/wiki?slug=${encodeURIComponent(WIKI_SYNTHESIS_SLUG)}`);
  await settle(page, 1200);
  await shot(page, "06-wiki-synthesis.png");

  // 4. Wiki infographic page (inline PNG preview)
  await go(page, `/wiki?slug=${encodeURIComponent(WIKI_INFOGRAPHIC_SLUG)}`);
  await settle(page, 2000); // give PNG time to load
  await shot(page, "09-wiki-infographic.png");

  // 5. Sources / Intake
  await go(page, "/sources");
  await settle(page);
  await shot(page, "04-sources.png");

  // 6. Lint
  await go(page, "/lint");
  await settle(page, 1200);
  await shot(page, "07-lint.png");

  // 7. Dispatch / Jobs
  await go(page, "/jobs");
  await settle(page);
  await shot(page, "03-jobs.png");

  // 8. Map / Graph (force-directed layout needs a beat to settle)
  await go(page, "/graph");
  await settle(page, 2500);
  await shot(page, "10-graph.png");

  // 9. Settings (The Press)
  await go(page, "/settings");
  await settle(page);
  await shot(page, "11-settings.png");

  // 10. Chat
  await go(page, "/chat");
  await settle(page);
  await shot(page, "12-chat.png");

  // 11. Compose / Dictation
  await go(page, "/compose");
  await settle(page);
  await shot(page, "13-compose.png");

  // 12. Help modal — trigger via keyboard by dispatching the literal "?"
  await go(page, "/");
  await settle(page, 500);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", shiftKey: true }));
  });
  await settle(page, 600);
  await shot(page, "05-help-modal.png");
  await page.keyboard.press("Escape");
  await settle(page, 400);

  // 13. ⌘K palette — dispatch the event since the global listener is what
  // registers the shortcut; a real keypress also works but this is robust
  // against focus differences in headless mode.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  });
  await settle(page, 600);
  await shot(page, "14-palette.png");
  await page.keyboard.press("Escape");
  await settle(page, 400);

  await browser.close();
  console.log("\nDone. Screenshots in docs/screenshots/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
