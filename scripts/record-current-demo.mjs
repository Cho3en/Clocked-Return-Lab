/** Current public recording: deterministic synthetic demo ONLY; zero Clocked calls. */
import {chromium} from "playwright-core";
import {existsSync,mkdirSync,renameSync,statSync} from "node:fs";
import {resolve,join} from "node:path";

const root=resolve(import.meta.dirname,".."), assets=join(root,"assets");
mkdirSync(assets,{recursive:true});
const chrome=[process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find(x=>x&&existsSync(x));
if(!chrome)throw Error("Chrome or Edge missing");
const browser=await chromium.launch({executablePath:chrome,headless:true,args:["--disable-gpu","--no-first-run"]});
const context=await browser.newContext({viewport:{width:1280,height:800},
  recordVideo:{dir:assets,size:{width:1280,height:800}}});
const page=await context.newPage(), failures=[], calls=[];
const sleep=ms=>page.waitForTimeout(ms);
page.on("pageerror",e=>failures.push(e.message));
page.on("request",r=>{
  if(!r.url().includes("/api/triage"))return;
  let mode;
  try{mode=r.postDataJSON()?.mode}catch{mode="invalid"}
  calls.push(mode);
  if(mode!=="demo")failures.push("Non-demo API request");
});
async function caption(kicker,title,description){
  await page.evaluate(({kicker,title,description})=>{
    let p=document.getElementById("judge-caption");
    if(!p){
      p=document.createElement("aside");p.id="judge-caption";
      p.setAttribute("aria-hidden","true");
      Object.assign(p.style,{
        position:"fixed",bottom:"18px",left:"18px",width:"335px",
        zIndex:"999999",padding:"14px 18px",background:"rgba(4,17,31,.97)",
        color:"white",border:"1px solid rgba(95,219,245,.5)",
        borderRadius:"13px",boxShadow:"0 12px 45px rgba(0,0,0,.6)",
        fontFamily:"Arial,sans-serif",pointerEvents:"none"
      });
      document.body.append(p);
    }
    p.replaceChildren();
    for(const [value,style] of [
      [kicker,{fontSize:"10px",color:"#8de9fa",letterSpacing:"1.3px",fontWeight:"700"}],
      [title,{fontSize:"22px",marginTop:"6px",fontWeight:"750",lineHeight:"1.2"}],
      [description,{fontSize:"12px",color:"#b7cad9",marginTop:"8px",lineHeight:"1.5"}]
    ]){const e=document.createElement("div");e.textContent=value;Object.assign(e.style,style);p.append(e);}
  },{kicker,title,description});
}
async function top(){await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));await sleep(400)}
async function showEvidence(){
  const details=page.locator("details").filter({has:page.getByText("Source-linked extraction",{exact:true})});
  await details.locator("summary").click();
  await details.scrollIntoViewIfNeeded();
  await sleep(1200);
}
async function scenario(button,target,number,title,description){
  await top();
  await page.getByRole("button",{name:button,exact:true}).click();
  await caption(number+" | SIMULATED",title,description);
  await sleep(1200);
  await page.getByRole("button",{name:"Run demo analysis"}).click();
  await page.getByText(target,{exact:true}).waitFor({timeout:12000});
  await sleep(2500);
  await showEvidence();
  await caption(number+" | SOURCE EVIDENCE",title,"Exact highlighted spans show what the customer CLAIMED, not independent proof.");
  await sleep(2800);
}
let good=false;
try{
  await page.goto(process.env.RETURNLAB_URL||"http://127.0.0.1:3182",{waitUntil:"networkidle"});
  await page.getByRole("button",{name:"Run demo analysis"}).waitFor();
  await caption("CLOCKED CHALLENGE 2026 | SIMULATED","Clocked Return Lab",
    "Returns & refunds triage: three synthetic cases, three explainable recommendations. No paid API calls.");
  await sleep(3000);
  await scenario("Clear return","Eligible under demo rules","01 / ELIGIBLE","Approve — provisional",
    "Unused and within the sample 30-day window. A human must verify the merchant order.");
  await scenario("Defective item","Escalate to a human","02 / EXCEPTION","Human Review",
    "Reported defect and missing delivery date require human assessment of rights and evidence.");
  await scenario("Outside window","Outside the return window","03 / EXPIRED","Decline — provisional",
    "Reported delivery 58 days ago is outside the illustrative return window.");
  await top();
  await caption("CLOCKED SDK IN SOURCE | FOUR ENDPOINTS","Protect → Guard → Extract → Decide",
    "The live API pipeline is separate. This recording is SIMULATED; no refund or customer message is executed.");
  await sleep(3100);
  if(failures.length||calls.length!==3||calls.some(x=>x!=="demo"))
    throw Error("Video safety gate failed: "+JSON.stringify({failures,calls}));
  good=true;
  console.log("RECORDING_VERIFIED demoCalls=3 liveCalls=0 errors=0 routes=3");
}finally{
  const video=page.video();
  await context.close();
  if(video&&good){
    const output=join(assets,"clocked-return-lab-current-demo.webm");
    renameSync(await video.path(),output);
    console.log("VIDEO_FILE="+output+" BYTES="+statSync(output).size);
  }
  await browser.close();
}
