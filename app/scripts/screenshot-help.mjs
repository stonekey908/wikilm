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

const p = await browser.newPage();
await p.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
await p.evaluateOnNewDocument(() => {
  localStorage.setItem("activeProject", "ai/llms");
});
await p.goto(`${BASE}/wiki`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 800));

// Click the Help button in the sidebar footer.
await p.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const btn = buttons.find((b) => b.textContent?.trim().startsWith("Help"));
  if (btn) btn.click();
});
await new Promise((r) => setTimeout(r, 400));
await p.screenshot({
  path: path.join(OUT_DIR, "05-help-modal.png"),
  fullPage: false,
});
await browser.close();
console.log("✓ help modal");
