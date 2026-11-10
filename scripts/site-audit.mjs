/**
 * Public site audit. Three routes: marketing (/), judge tour (/tour), workspace (/lab).
 * Verifies the tour really runs the demo engine, that every control works, and that
 * mobile shows the headline and main action without scrolling.
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const chrome = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((value) => value && existsSync(value));
if (!chrome) throw new Error("Chrome or Edge was not found.");
const site = process.env.RETURNLAB_URL || "http://127.0.0.1:3146";
const browser = await chromium.launch({ executablePath: chrome, headless: true });
let failures = 0;
const assert = (pass, label, detail = null) => {
  console.log((pass ? "PASS " : "FAIL ") + label + (detail ? " " + JSON.stringify(detail) : ""));
  if (!pass) failures++;
};

try {
  // ---------- marketing page, desktop ----------
  const home = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const homeErrors = [];
  home.on("pageerror", (error) => homeErrors.push(error.message));
  const homeResponse = await home.goto(site + "/", { waitUntil: "networkidle" });
  assert(homeResponse?.status() === 200, "marketing page returns 200");
  assert(await home.locator(".sidebar").count() === 0, "marketing page has no dashboard sidebar");
  const homeGeometry = await home.evaluate(() => {
    const h1 = document.querySelector("h1");
    const rect = h1?.getBoundingClientRect();
    const cta = document.querySelector(".mk-cta");
    const ctaRect = cta?.getBoundingClientRect();
    return {
      title: h1?.textContent?.trim(),
      fontSize: rect ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : 0,
      titleTop: Math.round(rect?.top ?? 9999),
      ctaTop: Math.round(ctaRect?.top ?? 9999),
      ctaHeight: Math.round(ctaRect?.height ?? 0),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  assert(homeGeometry.fontSize >= 60, "desktop headline is 60px or larger", homeGeometry.fontSize);
  assert(homeGeometry.ctaTop < 900, "primary action is above the fold on desktop");
  assert(homeGeometry.ctaHeight >= 44, "primary action meets the 44px target");
  assert(homeGeometry.overflow <= 0, "no horizontal overflow at 1440", homeGeometry.overflow);
  assert(await home.getByRole("link", { name: "Try the demo" }).count() === 1, "top navigation call to action present");
  assert(await home.locator(".mk-frame .mk-verdict-word").innerText() === "Approve", "product showcase renders a real verdict card");
  assert((await home.locator(".mk-frame mark").count()) >= 3, "showcase shows highlighted evidence spans");
  assert(homeErrors.length === 0, "no JavaScript errors on the marketing page", homeErrors);
  await home.getByRole("link", { name: "Try the three cases" }).click();
  await home.waitForURL("**/tour");
  assert(true, "primary call to action reaches the tour");
  await home.close();

  // ---------- marketing page, mobile ----------
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mobile.goto(site + "/", { waitUntil: "networkidle" });
  const mobileFold = await mobile.evaluate(() => {
    const h1 = document.querySelector("h1")?.getBoundingClientRect();
    const cta = document.querySelector(".mk-cta")?.getBoundingClientRect();
    const nav = document.querySelector(".mk-nav")?.getBoundingClientRect();
    return {
      navHeight: Math.round(nav?.height ?? 0),
      titleTop: Math.round(h1?.top ?? 9999),
      titleBottom: Math.round(h1?.bottom ?? 9999),
      ctaTop: Math.round(cta?.top ?? 9999),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      viewport: window.innerHeight,
    };
  });
  assert(mobileFold.navHeight <= 60, "mobile navigation stays compact", mobileFold.navHeight);
  assert(mobileFold.titleTop < 140, "mobile headline starts near the top", mobileFold.titleTop);
  assert(mobileFold.ctaTop < mobileFold.viewport, "mobile primary action is visible without scrolling", mobileFold);
  assert(mobileFold.overflow <= 0, "no horizontal overflow at 390", mobileFold.overflow);
  await mobile.close();

  // ---------- judge tour ----------
  const tour = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const tourErrors = [];
  tour.on("pageerror", (error) => tourErrors.push(error.message));
  await tour.goto(site + "/tour", { waitUntil: "networkidle" });
  assert(await tour.getByRole("heading", { name: "Three cases, one real engine" }).count() === 1, "tour page renders its heading");
  assert(await tour.locator(".sidebar").count() === 0, "tour page has no dashboard sidebar");
  assert(await tour.locator(".tour-progress li").count() === 3, "tour shows three progress steps");

  const expected = [
    { case: "Clear return", verdict: "Approve" },
    { case: "Defective item", verdict: "Human review" },
    { case: "Outside window", verdict: "Decline" },
  ];
  for (const [index, item] of expected.entries()) {
    if (index > 0) {
      await tour.getByRole("tab", { name: new RegExp(item.case) }).click();
    }
    await tour.getByRole("button", { name: /Run this case/ }).click();
    await tour.locator(".tour-verdict-word").getByText(item.verdict, { exact: true }).waitFor({ timeout: 15000 });
    const spans = await tour.locator(".tour-source .evidence-mark").count();
    assert(spans > 0, "case " + (index + 1) + " shows highlighted evidence", spans);
    const checks = await tour.locator(".tour-checks li").count();
    assert(checks >= 5, "case " + (index + 1) + " lists engine checks", checks);
  }
  assert((await tour.locator(".tour-progress li.is-done").count()) === 3, "progress marks all three cases reviewed");
  assert((await tour.locator(".tour-progress-label").innerText()).toLowerCase().includes("3 of 3"), "progress counter reports 3 of 3");
  await tour.getByRole("button", { name: /Run this case again/ }).click();
  await tour.locator(".tour-verdict-word").getByText("Decline", { exact: true }).waitFor({ timeout: 15000 });
  assert(true, "a case can be re-run");
  await tour.getByRole("button", { name: /Start over/ }).click();
  assert((await tour.locator(".tour-progress li.is-done").count()) === 0, "start over clears progress");
  assert(await tour.locator(".tour-verdict-word").count() === 0, "start over clears the verdict");
  assert(tourErrors.length === 0, "no JavaScript errors on the tour", tourErrors);
  await tour.getByRole("link", { name: /Open the full workspace|Open the workspace/ }).first().click();
  await tour.waitForURL("**/lab");
  assert(true, "tour links into the workspace");
  await tour.close();

  // ---------- workspace route ----------
  const lab = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const labResponse = await lab.goto(site + "/lab", { waitUntil: "networkidle" });
  assert(labResponse?.status() === 200, "workspace route returns 200");
  await lab.getByRole("button", { name: "Run demo analysis" }).click();
  await lab.locator("#decision-panel").getByText("Eligible under demo rules", { exact: true }).waitFor({ timeout: 15000 });
  assert(true, "workspace still runs the real analysis");
  assert(await lab.getByRole("link", { name: "Judge Tour" }).count() === 1, "workspace links back to the tour");
  await lab.close();
} finally {
  await browser.close();
}
console.log("SITE_AUDIT_RESULT " + JSON.stringify({ failures, pass: failures === 0 }));
if (failures) process.exitCode = 1;
