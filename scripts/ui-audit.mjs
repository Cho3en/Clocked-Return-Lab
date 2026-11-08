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
    await page.getByText("Eligible under demo rules",{exact:true}).waitFor({timeout:15000});
    await page.waitForTimeout(150);
    const geometry = await page.evaluate(()=>{
      const el=document.getElementById("decision-panel");
      const d=el?.getBoundingClientRect();
      const pageHeight=document.documentElement.scrollHeight;
      const inner=window.innerWidth;
      const doc=document.documentElement.scrollWidth;
      const input=document.getElementById("return-message")?.getBoundingClientRect();
      const ctas=[...document.querySelectorAll(".mode-tab,.sample-button,.primary-button")].map(e=>{
        const r=e.getBoundingClientRect();return {text:e.textContent.trim(),height:Math.round(r.height),width:Math.round(r.width)};
      });
      return {pageHeight,windowHeight:innerHeight,docWidth:doc,viewportWidth:inner,scrollY,outputTop:d?.top,outputHeight:d?.height,inputTop:input?.top,ctaTargets:ctas};
    });
    assert(geometry.docWidth<=geometry.viewportWidth,"no horizontal overflow "+width,geometry.docWidth>geometry.viewportWidth?geometry:null);
    assert(geometry.ctaTargets.every(x=>x.height>=44),"control touch height >=44 "+width,geometry.ctaTargets.filter(x=>x.height<44));
    if(width<=390)assert((geometry.outputTop??Infinity)<100,"mobile result auto-scrolls into view "+width,geometry);
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
  await bad.getByText("Escalate to a human",{exact:true}).waitFor();
  assert(await bad.getByText("Next human action",{exact:true}).count()===1,"next human action explicit in review");
  assert(await bad.getByText("Case linkage & intent",{exact:true}).count()===1,"case linkage drilldown available");
  await bad.close();
} finally {
  await browser.close();
}
console.log("UI_AUDIT_RESULT "+JSON.stringify({issues:problems,pass:problems===0}));
if(problems) process.exitCode=1;
