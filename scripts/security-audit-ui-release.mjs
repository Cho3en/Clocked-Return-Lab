import http from "node:http";
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const base = process.env.RETURNLAB_URL || "http://127.0.0.1:3146";
const results = [];
const assert = (label, pass, detail = "") => {
  results.push({label,pass,detail});
  console.log((pass ? "PASS " : "FAIL ") + label + (detail ? " " + detail : ""));
};
const requestJson = async (payload, opts = {}) => {
  const r = await fetch(base + "/api/triage", {
    method:"POST",
    headers:{"content-type":"application/json",...(opts.headers ?? {})},
    body:typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  let output; try { output=await r.json(); } catch { output=null; }
  return {status:r.status,body:output,headers:r.headers};
};
const synthetic = {
 mode:"demo",asOf:"2026-11-08",
 message:"Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I want a refund.",
};
const main = await fetch(base);
assert("home accessible",main.status===200,"HTTP "+main.status);
const secondPage = await fetch(base);
const firstPolicy = main.headers.get("content-security-policy") ?? "";
const secondPolicy = secondPage.headers.get("content-security-policy") ?? "";
assert("consecutive responses have distinct CSP nonces",Boolean(firstPolicy.match(/nonce-[A-Za-z0-9+/=]+/)) && firstPolicy!==secondPolicy);
assert("nonce-based strict script policy present",firstPolicy.includes("strict-dynamic") && firstPolicy.includes("script-src") && !firstPolicy.includes("script-src 'self' 'unsafe-inline'"));
const securityHeaders = {
 csp:main.headers.get("content-security-policy"),
 frame:main.headers.get("x-frame-options"),
 referrer:main.headers.get("referrer-policy"),
 permissions:main.headers.get("permissions-policy"),
 nosniff:main.headers.get("x-content-type-options"),
};
console.log("SECURITY_HEADERS "+JSON.stringify(Object.fromEntries(Object.entries(securityHeaders).map(([key,value])=>[key,Boolean(value)]))));
const legitimate = await requestJson(synthetic);
assert("synthetic demo returns 200",legitimate.status===200,"HTTP "+legitimate.status);
assert("demo is marked simulated",legitimate.body?.mode==="demo");
assert("API has nosniff",legitimate.headers.get("x-content-type-options")==="nosniff");
assert("API disables caching",legitimate.headers.get("cache-control")?.includes("no-store")??false);
const auth = await requestJson({...synthetic,mode:"live"});
assert("unauthenticated live request blocked",auth.status===401,"HTTP "+auth.status);
const malformed = await requestJson("{bogus");
assert("malformed JSON blocked",malformed.status===400,"HTTP "+malformed.status);
const missing = await requestJson({message:synthetic.message,asOf:synthetic.asOf});
assert("missing schema fields blocked",missing.status===400,"HTTP "+missing.status);
const tooLong = await requestJson({...synthetic,message:"X".repeat(20000)});
assert("oversized payload blocked",tooLong.status===413,"HTTP "+tooLong.status);
const wrongType = await fetch(base + "/api/triage",{method:"POST",headers:{"content-type":"text/plain"},body:"hi"});
assert("unsupported content type blocked",wrongType.status===415,"HTTP "+wrongType.status);

const rootURL = new URL(base);
const chunkedStatus = await new Promise((resolve,reject) => {
  const req = http.request({
    hostname:rootURL.hostname,
    port:Number(rootURL.port),
    method:"POST",path:"/api/triage",
    headers:{"content-type":"application/json","transfer-encoding":"chunked"},
  },response=>{response.resume();response.on("end",()=>resolve(response.statusCode));});
  req.on("error",reject);
  req.write(JSON.stringify({...synthetic,message:"X".repeat(28000)}).slice(0,10000));
  req.write("z".repeat(10000));
  req.end();
});
assert("chunked oversized payload blocked",chunkedStatus===413,"HTTP "+chunkedStatus);

const chrome=[
 process.env.CHROME_PATH,
 "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
 "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find(x=>x&&existsSync(x));
const browser=await chromium.launch({executablePath:chrome,headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:820}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const cspErrors=[];
 page.on("console",m=>{if(m.type()==="error" && /Content Security Policy/i.test(m.text())) cspErrors.push(m.text());});
 await page.goto(base,{waitUntil:"networkidle"});
 const payload='Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I want a refund. <img src=x onerror="window.__redteamExecuted=true"><svg onload="window.__redteamExecuted=true">';
 await page.locator("#return-message").fill(payload);
  const submittedRequest = page.waitForRequest(r => r.url().endsWith("/api/triage") && r.method() === "POST");
 await page.getByRole("button",{name:"Run demo analysis"}).click();
  const actualRequest = await submittedRequest;
  assert("browser submits the exact edited customer message", actualRequest.postDataJSON()?.message === payload);
 await page.getByText("Escalate to a human",{exact:true}).waitFor();
 const execution=await page.evaluate(()=>Boolean(window.__redteamExecuted));
 assert("user message does not execute script",!execution);
 assert("page hydrates without CSP violations",cspErrors.length===0);
 // A CDP page.evaluate call is privileged, so it cannot be used to prove
 // CSP enforcement: some scripted DOM insertions inherit trusted execution.
 // Instead serve an actual parser-inserted inline script under the app CSP.
 const probeServer=http.createServer((_req,res)=>{
   res.writeHead(200,{"content-type":"text/html","content-security-policy":firstPolicy});
   res.end('<!doctype html><html><body><script>window.__auditInlineRan=true</script><p>Probe</p></body></html>');
 });
 await new Promise(resolve=>probeServer.listen(0,"127.0.0.1",resolve));
 try {
   const address=probeServer.address();
   if(!address || typeof address==="string")throw new Error("No probe port");
   const probePage=await browser.newPage();
   try {
     await probePage.goto("http://127.0.0.1:"+address.port,{waitUntil:"load"});
     const ran=await probePage.evaluate(()=>Boolean(window.__auditInlineRan));
     assert("server-delivered inline script blocked by nonce CSP",!ran);
   } finally {await probePage.close();}
 } finally {await new Promise(resolve=>probeServer.close(resolve));}
 assert("no JavaScript exceptions",errors.length===0);
 await page.getByRole("button",{name:"Clocked live"}).click();
 assert("live token input uses password type",await page.locator("#live-access-token").getAttribute("type")==="password");
 assert("live date is not client-editable",await page.locator("#policy-date").isDisabled());
} finally { await browser.close(); }

const issues = [];
if(!securityHeaders.csp)issues.push("missing CSP on HTML");
if(!securityHeaders.frame)issues.push("missing X-Frame-Options/frame-ancestors");
if(!securityHeaders.referrer)issues.push("missing Referrer-Policy");
if(!securityHeaders.permissions)issues.push("missing Permissions-Policy");
if(!securityHeaders.nosniff)issues.push("missing HTML nosniff");
const failures=results.filter(x=>!x.pass);
console.log("SECURITY_AUDIT_RESULT "+JSON.stringify({checks:results.length,passed:results.length-failures.length,failed:failures.length,headerGaps:issues}));
// Missing HTML security headers fail the public-release gate even when API controls pass.
if(failures.length || issues.length)process.exitCode=1;
