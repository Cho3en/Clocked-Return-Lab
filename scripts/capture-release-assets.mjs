/**
 * Capture the five public screenshots from a running build.
 *
 * Every image is a real capture of the served application in demo mode, using
 * the same viewport sizes the README and judges' guide expect:
 * 1440x900 for desktop states and 390x844 for mobile.
 *
 * Usage: RETURNLAB_URL=http://127.0.0.1:3161 node scripts/capture-release-assets.mjs
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const executablePath = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((candidate) => candidate && existsSync(candidate));
if (!executablePath) throw new Error("Chrome or Edge was not found.");
const url = process.env.RETURNLAB_URL || "http://127.0.0.1:3161";
const target = resolve(process.env.RETURNLAB_ASSET_DIR || "assets");

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const errors = [];
  desktop.on("pageerror", (error) => errors.push(error.message));
  await desktop.goto(url, { waitUntil: "networkidle" });
  await desktop.getByRole("button", { name: "Clear return", exact: true }).waitFor({ timeout: 15000 });
  await desktop.evaluate(() => window.scrollTo(0, 0));
  await desktop.screenshot({ path: resolve(target, "dashboard.png") });

  for (const [sample, decision, file] of [
    ["Clear return", "APPROVE", "approved.png"],
    ["Defective item", "HUMAN REVIEW", "review.png"],
    ["Outside window", "DECLINE", "declined.png"],
  ]) {
    await desktop.getByRole("button", { name: sample, exact: true }).click();
    await desktop.getByRole("button", { name: "Run demo analysis" }).click();
    await desktop.locator(".reco-word").getByText(decision, { exact: true }).waitFor({ timeout: 15000 });
    await desktop.waitForTimeout(400);
    await desktop.evaluate(() => window.scrollTo(0, 0));
    await desktop.screenshot({ path: resolve(target, file) });
    console.log("CAPTURED " + file);
  }
  if (errors.length) throw new Error("Desktop JavaScript errors: " + JSON.stringify(errors));
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const mobileErrors = [];
  mobile.on("pageerror", (error) => mobileErrors.push(error.message));
  await mobile.goto(url, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Clear return", exact: true }).waitFor({ timeout: 15000 });
  await mobile.getByRole("button", { name: "Clear return", exact: true }).click();
  await mobile.getByRole("button", { name: "Run demo analysis" }).click();
  await mobile.locator(".reco-word").getByText("APPROVE", { exact: true }).waitFor({ timeout: 15000 });
  await mobile.waitForTimeout(400);
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.screenshot({ path: resolve(target, "mobile.png") });
  if (mobileErrors.length) throw new Error("Mobile JavaScript errors: " + JSON.stringify(mobileErrors));
  console.log("CAPTURED mobile.png");
  await mobile.close();
} finally {
  await browser.close();
}
