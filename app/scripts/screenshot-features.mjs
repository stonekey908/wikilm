/**
 * Grab screenshots of the output-generation features for the README.
 *
 * Runs against the local dev server (expects it on http://localhost:3000)
 * and writes PNG files into ../docs/screenshots/.
 *
 * Usage from app/:  node scripts/screenshot-features.mjs
 */
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), "..", "docs", "screenshots");
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

async function page() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  return p;
}

async function setActiveProject(p, slug) {
  // The project-switcher reads "activeProject" from localStorage. Set it
  // *before* the app's scripts run so the first render uses it.
  await p.evaluateOnNewDocument((s) => {
    localStorage.setItem("activeProject", s);
  }, slug);
}

// 1. Wiki page — shows the "Generate output" button in the header.
{
  const p = await page();
  await setActiveProject(p, "ai/llms");
  await p.goto(`${BASE}/wiki`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({
    path: path.join(OUT_DIR, "01-wiki-with-outputs.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ wiki page");
}

// 2. Generate-output modal open.
{
  const p = await page();
  await setActiveProject(p, "ai/llms");
  await p.goto(`${BASE}/wiki`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  // Click the "Generate output" button by its text.
  await p.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => b.textContent?.includes("Generate output"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({
    path: path.join(OUT_DIR, "02-generate-modal.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ generate modal");
}

// 3. /jobs page — shows type icons + model badges.
{
  const p = await page();
  await setActiveProject(p, "ai/llms");
  await p.goto(`${BASE}/jobs`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  await p.screenshot({
    path: path.join(OUT_DIR, "03-jobs-page.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ jobs page");
}

// 4. Sources page — shows humanized subtitle (bug fix A).
{
  const p = await page();
  await setActiveProject(p, "ai/llms");
  await p.goto(`${BASE}/sources`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  await p.screenshot({
    path: path.join(OUT_DIR, "04-sources.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ sources page");
}

await browser.close();
console.log(`\nScreenshots written to ${OUT_DIR}`);
