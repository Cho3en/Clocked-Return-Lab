import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const executablePath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((value) => existsSync(value));
if (!executablePath) throw new Error("Chrome or Edge was not found.");
const baseURL = process.env.RETURNLAB_URL || "http://127.0.0.1:3141";
const browser = await chromium.launch({ executablePath, headless: true });
const failures = [];
async function assert(condition, message) {
  if (!condition) throw new Error("Browser regression failed: " + message);
  console.log("PASS " + message);
}
try {
  const page = await browser.newPage({ viewport: { width: 1320, height: 960 } });
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Run demo analysis" }).waitFor();
  for (const [sample, expected] of [
    ["Clear return", "Eligible under demo rules"],
    ["Defective item", "Escalate to a human"],
    ["Outside window", "Outside the return window"],
  ]) {
    await page.getByRole("button", { name: sample, exact: true }).click();
    await page.getByRole("button", { name: "Run demo analysis" }).click();
    await page.locator("#decision-panel").getByText(expected, { exact: true }).waitFor({ timeout: 15000 });
    await assert(true, "demo route " + sample);
  }
  await page.getByRole("button", { name: "Clear return", exact: true }).click();
  await page.route("**/api/triage", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 850));
    try {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        mode: "demo",lane: "approve",redactedText: "Order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-10-27. It is unused and unopened. I want a refund.",
        evidence: [],assessments: [],checks: [],reasons: ["Stale fixture"],
        asOf: "2026-11-08", elapsedDays: 12,privacyNotice: "Test",policyNotice: "Test",requestId: "STALE-TEST",
      }) });
    } catch {
      // Client invalidation should abort the request before this response is delivered.
    }
  });
  await page.getByRole("button", { name: "Run demo analysis" }).click();
  await page.getByRole("button", { name: "Defective item", exact: true }).click();
  await page.waitForTimeout(1200);
  await assert((await page.locator("#return-message").inputValue()).includes("stopped working"), "current input is defective return");
  await assert((await page.getByText("Eligible under demo rules", { exact: true }).count()) === 0, "stale response cannot overwrite new customer");
  await page.unroute("**/api/triage");

  await page.getByRole("button", { name: "Clocked live" }).click();
  await assert((await page.locator("#live-access-token").getAttribute("type")) === "password", "private access control masks typed input");
  await assert(await page.getByRole("button", { name: "Run Clocked analysis" }).isDisabled(), "live analysis blocked without private token");
  await page.locator("#live-access-token").fill("x".repeat(43));
  await assert(await page.getByRole("button", { name: "Run Clocked analysis" }).isEnabled(), "token unlocks private analysis control");
  await assert(await page.locator("#policy-date").isDisabled(), "browser cannot change server live date");
  await page.getByRole("button", { name: "Run Clocked analysis" }).click();
  // A clean clone has no private token, and even a configured server may keep
  // live spend disabled. Both are legitimate blocks and must be reported
  // truthfully rather than as a successful analysis.
  const liveBlockAlert = page.locator(".error-box[role=\"alert\"]");
  await liveBlockAlert.waitFor({ timeout: 15000 });
  const liveBlockText = (await liveBlockAlert.textContent()) ?? "";
  await assert(/not configured|not enabled|missing or invalid/i.test(liveBlockText), "server reports the real live-mode block: " + liveBlockText.slice(0, 90));
  await assert(!/Eligible under demo rules|Escalate to a human/i.test(liveBlockText), "blocked live analysis shows no decision");
  await page.close();

  const mobile = await browser.newPage({ viewport: {width: 390,height: 844}, deviceScaleFactor: 1 });
  mobile.on("pageerror", (error) => failures.push(error.message));
  await mobile.goto(baseURL, {waitUntil:"networkidle"});
  await mobile.getByRole("button", { name: "Run demo analysis" }).waitFor();
  await assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no mobile horizontal overflow at 390px");
  await mobile.getByRole("button", { name: "Run demo analysis" }).click();
  await mobile.locator("#decision-panel").getByText("Eligible under demo rules", {exact:true}).waitFor({timeout:15000});
  await assert(true, "mobile still displays useful decision output");
  await mobile.close();
  await assert(failures.length === 0, "zero page JavaScript exceptions");
  console.log("BROWSER_REGRESSION_COMPLETE=PASS");
} finally { await browser.close(); }
