import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
const executablePath = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync);
if (!executablePath) throw new Error("Chrome or Edge not installed");
const url = process.env.RETURNLAB_URL || "http://127.0.0.1:3156";
const target = process.env.RETURNLAB_QA_DIR || "C:\\VELES\\QA\\Clocked-Return-Lab\\post-remediation";
mkdirSync(target, {recursive:true});
const browser = await chromium.launch({executablePath,headless:true});
try {
  for(const {width,height,name} of [
    {width:1440,height:900,name:"desktop"},
    {width:390,height:844,name:"mobile"},
    {width:1024,height:900,name:"tablet"},
  ]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(url,{waitUntil:"networkidle"});
    // Capture the real application styling without bypassing its strict CSP.
    await page.getByRole("button",{name:"Run demo analysis"}).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({path:target+"\\"+name+"-idle.png",fullPage:true});
    for(const [sample,decision,label] of [
      ["Clear return","APPROVE","approve"],
      ["Defective item","HUMAN REVIEW","review"],
      ["Outside window","DECLINE","decline"],
    ]) {
      await page.getByRole("button",{name:sample,exact:true}).click();
      await page.getByRole("button",{name:"Run demo analysis"}).click();
      await page.locator(".reco-word").getByText(decision,{exact:true}).waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({path:target+"\\"+name+"-"+label+".png",fullPage:true});
      console.log("CAPTURED "+name+" "+label);
    }
    if(errors.length) throw new Error(name+" JavaScript errors: "+JSON.stringify(errors));
    await page.close();
  }
} finally { await browser.close(); }
console.log("QA_SCREENSHOTS="+target);