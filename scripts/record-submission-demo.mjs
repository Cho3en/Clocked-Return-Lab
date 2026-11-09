/** Polished public video: true UI, synthetic sample data, zero live provider calls. */
import {chromium} from "playwright-core";
import {existsSync,readFileSync,mkdirSync,renameSync,statSync} from "node:fs";
import {join,resolve} from "node:path";
const root=resolve(import.meta.dirname,"..");
const out=process.env.RETURNLAB_QA_DIR||join(root,"qa","submission");
mkdirSync(out,{recursive:true});
const manifestPath=existsSync(join(out,"manifest.json")) ? join(out,"manifest.json") : join(root,"docs","narration-manifest.json");
const {segments,totalDuration}=JSON.parse(readFileSync(manifestPath,"utf8"));
const chrome=[
 "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
 "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find(existsSync);
if(!chrome)throw Error("Chrome missing");
const browser=await chromium.launch({executablePath:chrome,headless:true,args:["--disable-gpu","--hide-scrollbars","--no-first-run"]});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,
 recordVideo:{dir:out,size:{width:1440,height:900}},reducedMotion:"reduce"});
const page=await context.newPage();
const failures=[],calls=[],results=[];
page.on("pageerror",e=>failures.push("JS "+e.message));
page.on("request",request=>{
 if(!request.url().endsWith("/api/triage")||request.method()!=="POST")return;
 const mode=request.postDataJSON()?.mode;
 calls.push(mode);
 if(mode!=="demo")failures.push("Non-demo API call attempted");
});
const wait=(ms)=>page.waitForTimeout(Math.max(0,ms));
async function caption(seg){
 await page.evaluate(({kicker,title})=>{
  let el=document.getElementById("judge-caption");
  if(!el){
    el=document.createElement("aside");el.id="judge-caption";el.setAttribute("aria-hidden","true");
    Object.assign(el.style,{
      position:"fixed",left:"calc(50% - 300px)",bottom:"19px",width:"600px",
      zIndex:"1000000",padding:"13px 20px 14px",background:"rgba(255,250,247,.985)",
      color:"#34231f",border:"1px solid #e5c7b9",borderLeft:"6px solid #e35336",
      boxShadow:"0 14px 48px rgba(52,35,31,.22)",borderRadius:"12px",
      fontFamily:"Arial,sans-serif",pointerEvents:"none",transition:"opacity .25s ease"
    });
    document.body.appendChild(el);
  }
  el.replaceChildren();
  const top=document.createElement("div");
  top.textContent="CLOCKED RETURN LAB  •  "+kicker;
  Object.assign(top.style,{fontWeight:"800",fontSize:"11px",letterSpacing:"1.6px",color:"#b64225"});
  const heading=document.createElement("div");
  heading.textContent=title;
  Object.assign(heading.style,{fontWeight:"800",fontSize:"23px",marginTop:"4px",lineHeight:"1.13",color:"#49271b"});
  const desc=document.createElement("div");
  desc.textContent="SYNTHETIC DEMO  •  ADVISORY RECOMMENDATIONS  •  NO REFUNDS EXECUTED";
  Object.assign(desc.style,{fontSize:"10px",fontWeight:"700",letterSpacing:".55px",marginTop:"7px",color:"#806b63"});
  el.append(top,heading,desc); el.style.opacity="1";
 },seg);
}
async function hideCaption(){await page.evaluate(()=>{const el=document.getElementById("judge-caption");if(el)el.style.opacity="0";});}
async function top(){await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));}
async function scene(i,action){
 const start=Date.now(),s=segments[i];
 await caption(s);
 await action();
 const elapsed=Date.now()-start, remaining=s.duration*1000-elapsed;
 if(remaining<0)failures.push("Segment overran duration: "+s.id+" by "+Math.round(-remaining)+"ms");
 if(remaining>4800){await wait(3200);await hideCaption();}
 await wait(Math.max(0,s.duration*1000-(Date.now()-start)));
 console.log("SCENE "+s.id+" target="+s.duration+"s actual="+((Date.now()-start)/1000).toFixed(2)+"s");
}
let completed=false;
try{
 await page.goto(process.env.RETURNLAB_URL||"http://127.0.0.1:3189",{waitUntil:"networkidle"});
 await page.getByRole("button",{name:"Run demo analysis"}).waitFor();
 await scene(0,async()=>{await top();});
 await scene(1,async()=>{
   await top();
   await page.getByRole("button",{name:"Clear return",exact:true}).click();
   await page.getByRole("button",{name:"Run demo analysis"}).click();
   await page.locator(".reco-word").getByText("APPROVE",{exact:true}).waitFor({timeout:12000});
   results.push("APPROVE");
 });
 await scene(2,async()=>{
   const link=page.getByRole("link",{name:"Inspect Evidence"});
   await link.click();
   const section=page.locator(".detail-panel").first();
   await section.locator("summary").click();
   await section.scrollIntoViewIfNeeded();
   if(!(await section.evaluate(e=>e.open)))throw Error("Evidence not open");
   if((await section.locator("mark").count())<1)throw Error("No grounded evidence spans");
 });
 await scene(3,async()=>{
   await top();
   await page.getByRole("button",{name:"Defective item",exact:true}).click();
   await page.getByRole("button",{name:"Run demo analysis"}).click();
   await page.locator(".reco-word").getByText("HUMAN REVIEW",{exact:true}).waitFor({timeout:12000});
   results.push("HUMAN REVIEW");
 });
 await scene(4,async()=>{
   await top();
   await page.getByRole("button",{name:"Outside window",exact:true}).click();
   await page.getByRole("button",{name:"Run demo analysis"}).click();
   await page.locator(".reco-word").getByText("DECLINE",{exact:true}).waitFor({timeout:12000});
   results.push("DECLINE");
 });
 await scene(5,async()=>{
   await top();
   await page.getByRole("button",{name:"Clocked live"}).click();
   if((await page.locator(".pipeline-live .pp-stage").count())!==5)throw Error("Clocked stages absent");
   if(!(await page.getByRole("button",{name:"Run Clocked analysis"}).isDisabled()))throw Error("Paid action unexpectedly enabled");
 });
 await scene(6,async()=>{
   await page.getByRole("button",{name:"Demo fixtures"}).click();
   await page.getByRole("button",{name:"Clear return",exact:true}).click();
   await page.getByRole("button",{name:"Run demo analysis"}).click();
   await page.locator(".reco-word").getByText("APPROVE",{exact:true}).waitFor({timeout:12000});
   await top();
 });
 await hideCaption();await wait(250);
 if(failures.length||calls.length!==4||calls.some(m=>m!=="demo")||results.join("|")!=="APPROVE|HUMAN REVIEW|DECLINE"){
   throw Error("Recording validation failure: "+JSON.stringify({failures,calls,results}));
 }
 completed=true;
 console.log("VIDEO_QA_PASS "+JSON.stringify({scenes:segments.length,nominalSeconds:totalDuration,apiCalls:calls,results,errors:0}));
}finally{
 const video=page.video();await context.close();
 if(video&&completed){
  const final=join(out,"clocked-return-lab-narrated-video.webm");
  renameSync(await video.path(),final);
  console.log("VIDEO_WEBM "+final+" BYTES="+statSync(final).size);
 }
 await browser.close();
}