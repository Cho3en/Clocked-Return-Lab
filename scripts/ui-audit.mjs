import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chrome = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find(p => p && existsSync(p));
if (!chrome) throw new Error("Chrome or Edge missing");
const base = process.env.RETURNLAB_URL || "http://127.0.0.1:3146";
const browser = await chromium.launch({ executablePath: chrome, headless: true });
let problems = 0;
const assert = (pass, description, details = null) => {
  console.log((pass ? "PASS " : "FAIL ") + description + (details ? " " + JSON.stringify(details) : ""));
  if (!pass) problems++;
};
try {
  for (const width of [320,360,390,768,1024,1440]) {
    const page = await browser.newPage({
      viewport: {width,height:900}, deviceScaleFactor:1,
      reducedMotion:"reduce",
    });
    const pageErrors = [];
    page.on("pageerror", e=>pageErrors.push(e.message));
    await page.goto(base,{waitUntil:"networkidle"});
    await page.getByRole("button",{name:"Run demo analysis"}).waitFor({timeout:15000});
    assert(await page.getByRole("button",{name:"Demo fixtures"}).getAttribute("aria-pressed")==="true","demo mode exposed accessibly "+width);
    assert(await page.getByRole("button",{name:"Clear return",exact:true}).getAttribute("aria-pressed")==="true","sample selection exposed accessibly "+width);
    await page.getByRole("button",{name:"Run demo analysis"}).click();
    await page.locator("#decision-panel").getByText("Eligible under demo rules",{exact:true}).waitFor({timeout:15000});
    await page.waitForTimeout(150);
    const geometry = await page.evaluate(()=>{
      const el=document.getElementById("decision-panel");
      const d=el?.getBoundingClientRect();
      const pageHeight=document.documentElement.scrollHeight;
      const inner=window.innerWidth;
      const doc=document.documentElement.scrollWidth;
      const input=document.getElementById("return-message")?.getBoundingClientRect();
      const ctas=[...document.querySelectorAll(".mode-btn,.sample-btn,.primary-btn")].map(e=>{
        const r=e.getBoundingClientRect();return {text:e.textContent.trim(),height:Math.round(r.height),width:Math.round(r.width)};
      });
      return {pageHeight,windowHeight:innerHeight,docWidth:doc,viewportWidth:inner,scrollY,outputTop:d?.top,outputHeight:d?.height,inputTop:input?.top,ctaTargets:ctas};
    });
    assert(geometry.docWidth<=geometry.viewportWidth,"no horizontal overflow "+width,geometry.docWidth>geometry.viewportWidth?geometry:null);
    assert(geometry.ctaTargets.every(x=>x.height>=44),"control touch height >=44 "+width,geometry.ctaTargets.filter(x=>x.height<44));
    // The sticky application header and scroll margin intentionally keep the result around 122px from the viewport top.
    if(width<=390)assert((geometry.outputTop??Infinity)>=0 && (geometry.outputTop??Infinity)<180,"mobile result visible beneath sticky header "+width,geometry);
    const detail=page.locator("details").first();
    await detail.locator("summary").click();
    assert(await detail.evaluate(el=>el.open),"evidence expansion works "+width);
    assert((await detail.locator(".source-text mark").count())>0,"source evidence highlights render "+width);
    assert(pageErrors.length===0,"no JS errors "+width,pageErrors);
    if(width===1440) {
      await page.screenshot({path:join(tmpdir(),"returnlab-redesign-desktop.png"),fullPage:true});
      await detail.locator("summary").click();
      await page.screenshot({path:join(tmpdir(),"returnlab-redesign-desktop-compact.png"),fullPage:false});
    }
    if(width===390) {
      await page.screenshot({path:join(tmpdir(),"returnlab-redesign-mobile.png"),fullPage:true});
      await detail.locator("summary").click();
      await page.screenshot({path:join(tmpdir(),"returnlab-redesign-mobile-result.png"),fullPage:false});
    }
    if(width===320) {
      await detail.locator("summary").focus();
      await page.keyboard.press("Enter");
      assert(!(await detail.evaluate(el=>el.open)),"keyboard Enter toggles details");
      await page.keyboard.press("Enter");
      assert(await detail.evaluate(el=>el.open),"keyboard Enter reopens details");
      await page.getByRole("button",{name:"Clocked live"}).click();
      assert(await page.getByRole("button",{name:"Clocked live"}).getAttribute("aria-pressed")==="true","live mode state accessible");
      assert(await page.locator("#live-access-token").getAttribute("type")==="password","access token password input");
      assert(await page.locator("#policy-date").isDisabled(),"live date is server controlled");
      assert(await page.getByRole("button",{name:"Run Clocked analysis"}).isDisabled(),"live button blocked without token");
    }
    console.log("VIEWPORT_SUMMARY "+JSON.stringify({width,outputTop:Math.round(geometry.outputTop??0),scrollY:Math.round(geometry.scrollY),pageHeight:geometry.pageHeight}));
    await page.close();
  }
  const bad=await browser.newPage({viewport:{width:390,height:820},reducedMotion:"reduce"});
  await bad.goto(base,{waitUntil:"networkidle"});
  await bad.getByRole("button",{name:"Defective item",exact:true}).click();
  await bad.getByRole("button",{name:"Run demo analysis"}).click();
  await bad.locator("#decision-panel").getByText("Escalate to a human",{exact:true}).waitFor();
  assert(await bad.getByText("Next human action",{exact:true}).count()===1,"next human action explicit in review");
  assert(await bad.getByText("Case linkage & intent",{exact:true}).count()===1,"case linkage drilldown available");
  await bad.close();

  // Post-redesign functional checks: anchor navigation, session-scoped metrics, and honest stage states.
  const review = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await review.goto(base, { waitUntil: "networkidle" });
  for (const [label, target] of [
    ["Overview", "#overview"], ["Cases", "#case-workspace"],
    ["New Case", "#return-message"], ["Analytics", "#analytics"], ["Evidence", "#evidence-details"],
  ]) {
    const link = review.getByRole("link", { name: label, exact: true });
    assert(await link.getAttribute("href") === target, label + " navigation destination");
    await link.click();
    assert(await link.getAttribute("aria-current") === "location", label + " marks current selection");
    assert(await review.locator(target).count() === 1, label + " destination exists");
  }
  assert(await review.locator('input[aria-label="Search cases, orders, customers"]').count() === 0,
    "unsupported global history search removed");
  await review.getByRole("link", { name: "Inspect Evidence" }).click();
  assert(new URL(review.url()).hash === "#evidence-details", "Inspect Evidence reaches evidence details");
  await review.getByRole("button", { name: "Run demo analysis" }).click();
  await review.locator(".reco-word").getByText("APPROVE", { exact: true }).waitFor();
  assert(await review.locator(".pp-stage.demo").count() === 4,
    "demo mode does not claim Clocked provider execution");
  assert(await review.locator(".pp-stage.done").count() === 1,
    "only Request marked complete in demo");
  assert((await review.locator(".metric-value").first().innerText()) === "1",
    "session count reflects successful evaluation");
  await review.getByRole("button", { name: "Defective item", exact: true }).click();
  await review.getByRole("button", { name: "Run demo analysis" }).click();
  await review.locator(".reco-word").getByText("HUMAN REVIEW", { exact: true }).waitFor();
  assert((await review.locator(".metric-value").first().innerText()) === "2",
    "session metric accumulates actual evaluations");
  assert((await review.locator(".session-bar-row").count()) === 3,
    "session distribution renders observed outcomes");
  await review.close();

  const mobilePriority = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await mobilePriority.goto(base, { waitUntil: "networkidle" });
  const positions = await mobilePriority.evaluate(() => ({
    workspace: document.querySelector(".workspace")?.getBoundingClientRect().top,
    metrics: document.querySelector(".metrics")?.getBoundingClientRect().top,
    analytics: document.querySelector(".analytics")?.getBoundingClientRect().top,
  }));
  assert(positions.workspace < positions.metrics && positions.workspace < positions.analytics,
    "mobile prioritizes case workspace ahead of analytics", positions);
  await mobilePriority.close();

  // Deterministic intercepted response: simulates a Guard-blocked live result without external calls.
  const guardPage = await browser.newPage({ viewport: { width: 1320, height: 900 } });
  await guardPage.route("**/api/triage", async (route) => {
    const original = await route.request().postDataJSON();
    const response = await fetch(base + "/api/triage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...original, mode: "demo" }),
    });
    const data = await response.json();
    data.mode = "live";
    data.lane = "review";
    data.evidence = [];
    data.assessments = [];
    data.checks = data.checks.map((check) =>
      check.label === "Prompt-injection screening" ? { ...check, status: "unknown" } : check);
    data.reasons = ["Guard was unable to establish a safe result."];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
  await guardPage.goto(base, { waitUntil: "networkidle" });
  await guardPage.getByRole("button", { name: "Run demo analysis" }).click();
  await guardPage.locator(".reco-word").getByText("HUMAN REVIEW", { exact: true }).waitFor();
  assert(await guardPage.locator(".pp-stage.done").count() === 2,
    "Guard-blocked response marks Request and Protect only as complete");
  assert(await guardPage.locator(".pp-stage.attention").count() === 1,
    "Guard is marked blocked or uncertain");
  assert(await guardPage.locator(".pp-stage.skipped").count() === 2,
    "Extract and Decide are correctly marked not run after Guard block");
  await guardPage.close();
} finally {
  await browser.close();
}
console.log("UI_AUDIT_RESULT "+JSON.stringify({issues:problems,pass:problems===0}));
if(problems) process.exitCode=1;
