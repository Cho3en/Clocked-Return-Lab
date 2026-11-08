import { chromium } from "playwright-core";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const assets = join(root, "assets");
mkdirSync(assets, { recursive: true });
const candidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const browserPath = candidates.find((candidate) => existsSync(candidate));
if (!browserPath) throw new Error("Chrome or Edge not found. Set CHROME_PATH.");
const baseUrl = process.env.RETURNLAB_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: browserPath, headless: true, args: ["--disable-gpu"] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 1 });
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#return-message").waitFor();
  const cases = [
    { name: "Clear return", result: "Eligible under demo rules", path: "approved.png" },
    { name: "Defective item", result: "Escalate to a human", path: "review.png" },
    { name: "Outside window", result: "Outside the return window", path: "declined.png" },
  ];
  for (const entry of cases) {
    await page.getByRole("button", { name: entry.name, exact: true }).click();
    await page.getByRole("button", { name: "Run demo analysis" }).click();
    await page.getByText(entry.result, { exact: true }).waitFor({ timeout: 10_000 });
    await page.screenshot({ path: join(assets, entry.path), fullPage: true });
    console.log(entry.name + ": " + entry.result + " — " + entry.path);
  }
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on("pageerror", (err) => errors.push(err.message));
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Run demo analysis" }).click();
  await mobile.getByText("Eligible under demo rules", { exact: true }).waitFor({ timeout: 10_000 });
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error("Unexpected horizontal overflow at 390px viewport");
  await mobile.screenshot({ path: join(assets, "mobile.png"), fullPage: true });
  if (errors.length) throw new Error("Browser errors: " + errors.join(" | "));
  copyFileSync(join(assets, "approved.png"), join(assets, "dashboard.png"));
  console.log("Visual checks passed; screenshots in assets/");
} finally {
  await browser.close();
}
