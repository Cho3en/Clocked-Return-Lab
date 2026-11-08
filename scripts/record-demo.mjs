import { chromium } from "playwright-core";
import { existsSync, mkdirSync, renameSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const assets = join(root, "assets");
mkdirSync(assets, { recursive: true });
const executablePath = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((candidate) => candidate && existsSync(candidate));
if (!executablePath) throw new Error("Chrome or Edge missing. Set CHROME_PATH.");
const baseURL = process.env.RETURNLAB_URL || "http://127.0.0.1:3137";
const browser = await chromium.launch({
  executablePath, headless: true,
  args: ["--disable-gpu", "--hide-scrollbars", "--no-first-run"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: assets, size: { width: 1280, height: 900 } },
});
const page = await context.newPage();
const failures = [];
page.on("pageerror", (e) => failures.push(e.message));

async function announce(kicker, title, detail) {
  await page.evaluate(({ kicker, title, detail }) => {
    const id = "recording-title";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("aside");
      el.id = id;
      el.setAttribute("aria-hidden", "true");
      Object.assign(el.style, {
        position: "fixed", bottom: "22px", right: "20px",
        zIndex: "999999", width: "420px", maxWidth: "calc(100vw - 40px)",
        padding: "18px 21px", border: "1px solid rgba(118,226,249,.35)",
        borderRadius: "14px", color: "white", background: "rgba(5,19,35,.96)",
        boxShadow: "0 16px 80px rgba(0,0,0,.6)",
        fontFamily: "Arial, sans-serif", pointerEvents: "none",
      });
      document.body.appendChild(el);
    }
    el.replaceChildren();
    const topline = document.createElement("div");
    topline.textContent = kicker;
    Object.assign(topline.style, { fontSize: "11px", letterSpacing: "2px", fontWeight: "700", color: "#8de9f9" });
    const head = document.createElement("div");
    head.textContent = title;
    Object.assign(head.style, { fontSize: "25px", fontWeight: "750", lineHeight: "1.2", marginTop: "7px" });
    const desc = document.createElement("div");
    desc.textContent = detail;
    Object.assign(desc.style, { fontSize: "12px", color: "#bdcddc", lineHeight: "1.55", marginTop: "8px" });
    el.append(topline, head, desc);
  }, { kicker, title, detail });
}
const pause = (ms) => page.waitForTimeout(ms);
async function top() { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await pause(900); }
async function showEvidence() { await page.getByText("Source-linked extraction", { exact: true }).scrollIntoViewIfNeeded(); await pause(1700); }

try {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Run demo analysis" }).waitFor({ timeout: 20000 });
  await announce("CLOCKED BUILD CHALLENGE · 2026", "Returns. Routed with reason.", "Real Clocked Protect → Extract → Decide → Guard. Policy-backed recommendations, not automatic refunds.");
  await pause(4200);
  await page.getByRole("button", { name: "Clocked live" }).click();
  // The private token never appears in CLI output or the repository. The input is type=password.
  const secretFile = join(root, ".env.local");
  const localConfig = existsSync(secretFile) ? readFileSync(secretFile, "utf8") : "";
  const accessToken = process.env.RETURNLAB_ACCESS_TOKEN || localConfig.match(/^RETURNLAB_ACCESS_TOKEN=(\S+)/m)?.[1];
  if (!accessToken || accessToken.length < 32) throw new Error("Private live access is not configured.");
  await page.locator("#live-access-token").fill(accessToken);
  await announce("01 / ELIGIBLE RETURN", "Evidence-backed approval", "A synthetic customer requests an unused return, 12 days after delivery. This is a live Clocked API call.");
  await pause(1200);
  await page.getByRole("button", { name: "Run Clocked analysis" }).click();
  await page.getByText("Eligible under example policy", { exact: true }).waitFor({ timeout: 120000 });
  await pause(2400);
  await showEvidence();
  await announce("SOURCE EVIDENCE", "Exact spans + model probabilities", "The API returns protected text, source offsets, typed Yes probabilities and an injection risk score.");
  await pause(4600);
  await top();

  await page.getByRole("button", { name: "Defective item", exact: true }).click();
  await announce("02 / PRODUCT DEFECT", "Uncertainty triggers review", "A broken product and missing delivery date must go to a human. Consumer rights aren't replaced by the demo policy.");
  await pause(1300);
  await page.getByRole("button", { name: "Run Clocked analysis" }).click();
  await page.getByText("Escalate to a human", { exact: true }).waitFor({ timeout: 120000 });
  await pause(4700);
  await showEvidence();
  await pause(2600);
  await top();

  await page.getByRole("button", { name: "Outside window", exact: true }).click();
  await announce("03 / OUTSIDE RETURN WINDOW", "Clear policy cutoff", "58 days after delivery. A deterministic 30-day example policy leads to a decline recommendation.");
  await pause(1200);
  await page.getByRole("button", { name: "Run Clocked analysis" }).click();
  await page.getByText("Outside the return window", { exact: true }).waitFor({ timeout: 120000 });
  await pause(4800);
  await showEvidence();
  await pause(2500);
  await top();
  await announce("LIVE CLOCKED · FOUR SERVICES", "Safer decisions. Human control.", "Protect first. Extract exact evidence. Decide with probabilities. Guard against injection. No payments, refunds or emails are executed.");
  await pause(4600);
  if (failures.length) throw new Error("Browser errors: " + failures.join(" | "));
  console.log("LIVE_VIDEO_SCENARIOS=3; BROWSER_ERRORS=0; ALL_EXPECTED_ROUTES=PASS");
} finally {
  const video = page.video();
  await context.close();
  if (video) {
    const videoPath = await video.path();
    const output = join(assets, "clocked-return-lab-live-demo.webm");
    renameSync(videoPath, output);
    console.log("VIDEO_PATH=" + output);
  }
  await browser.close();
}
