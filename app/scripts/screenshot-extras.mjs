import puppeteer from "puppeteer-core";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), "..", "docs", "screenshots");
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

async function page(slug = "ai/llms") {
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument((s) => {
    localStorage.setItem("activeProject", s);
  }, slug);
  return p;
}

async function openWikiDetail(p, title) {
  await p.goto(`${BASE}/wiki`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().startsWith("Expand all")
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  // Find the exact row by locating the <h3> with matching text, then
  // walking up to its clickable ancestor (which has cursor-pointer class).
  const ok = await p.evaluate((t) => {
    // Title text lives in a div whose textContent equals the title exactly.
    const all = Array.from(document.querySelectorAll("div"));
    const match = all.find((el) => el.textContent?.trim() === t && el.children.length === 0);
    if (!match) return false;
    let cur = match;
    for (let i = 0; i < 8 && cur; i++) {
      const cls = typeof cur.className === "string" ? cur.className : "";
      if (cls.includes("cursor-pointer")) {
        cur.click();
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }, title);
  if (!ok) console.warn(`could not find row: ${title}`);
  await new Promise((r) => setTimeout(r, 1500));
}

// A) Wiki page with a concept detail open — replaces 01 with a richer shot.
{
  const p = await page("ai/llms");
  await openWikiDetail(p, "Mixture-of-Experts (MoE)");
  await p.screenshot({
    path: path.join(OUT_DIR, "01-wiki-with-outputs.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ wiki concept detail");
}

// B) Wiki synthesis page — shows LLM-written project overview.
{
  const p = await page("ai/llms");
  // The synthesis card at the top opens synthesis/project-overview.
  await p.goto(`${BASE}/wiki`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Project synthesis")
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({
    path: path.join(OUT_DIR, "06-wiki-synthesis.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ wiki synthesis detail");
}

// C) Lint page — health check with findings.
{
  const p = await page("ai/llms");
  await p.goto(`${BASE}/lint`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await p.screenshot({
    path: path.join(OUT_DIR, "07-lint.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ lint page");
}

// D) Dashboard with Nudges section — needs a parent project (ai = id 9).
{
  const p = await page("ai");
  await p.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await p.screenshot({
    path: path.join(OUT_DIR, "08-nudges.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ dashboard nudges");
}

await browser.close();
console.log(`\nWritten to ${OUT_DIR}`);
