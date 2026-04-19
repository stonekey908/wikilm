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

// A) /sources with New note button visible
{
  const p = await page("ai/llms");
  await p.goto(`${BASE}/sources`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({
    path: path.join(OUT_DIR, "09-sources-with-new-note.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ sources with new note");
}

// B) New note modal open
{
  const p = await page("ai/llms");
  await p.goto(`${BASE}/sources`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 900));
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().startsWith("New note")
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({
    path: path.join(OUT_DIR, "10-new-note-modal.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ new note modal");
}

// C) /chat header with Save thread as note button
{
  const p = await page("ai/llms");
  await p.goto(`${BASE}/chat`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({
    path: path.join(OUT_DIR, "11-chat-save-thread.png"),
    fullPage: false,
  });
  await p.close();
  console.log("✓ chat header");
}

await browser.close();
console.log(`\nWritten to ${OUT_DIR}`);
