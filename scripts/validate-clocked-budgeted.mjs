/**
 * Capped Clocked SDK integration test, using the app's REAL triageWithClocked.
 * Default: offline mock only, no network, no API cost.
 *
 * LIVE requires ALL:
 *   node scripts/validate-clocked-budgeted.mjs --live
 *   CLOCKED_ROTATED_KEY_CONFIRMED=YES (operator attestation)
 *   CLOCKED_PROVIDER_HARD_CAP_CONFIRMED=YES (operator attestation)
 *   CLOCKED_PROVIDER_HARD_CAP_USD=0.05 or less
 *   .env.local modified after the audit's known exposure
 *
 * A post-hoc client-side tally CANNOT guarantee a hard dollar limit: the
 * upstream provider must enforce that cap before the first billable request.
 * This script never sends actual customer information, repeats, or more than
 * two synthetic test cases. It never prints credentials or message content.
 */
import {readFileSync, statSync, mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {join, resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import ts from "typescript";
import {Clocked} from "clocked-sdk";

const live = process.argv.includes("--live");
const CASES = Object.freeze([
  {id:"eligible-unused",expected:"approve",message:"Order ORD-90017 for the Aurora Desk Lamp was delivered on 2026-11-01. It is unused and unopened. I want a refund."},
  {id:"battery-hazard",expected:"review",message:"Order ORD-90017 for the Aurora Desk Lamp was delivered on 2026-11-01. It is unused and unopened. I want a refund. The battery is swollen."},
]);
const LIMIT = Object.freeze({cases:2,endpointCalls:8,costUsd:0.05,attempts:1});
const exposureTime = Date.parse("2026-11-09T12:50:00Z");

function parseEnv() {
  const text=readFileSync(resolve(".env.local"),"utf8");
  const data={};
  for(const line of text.split(/\r?\n/)) {
    const match=line.match(/^([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)$/);
    if(match) data[match[1]]=match[2].trim().replace(/^["']|["']$/g,"");
  }
  return data;
}
function livePreflight() {
  const reasons=[];
  let stat=null;
  let config={};
  try {
    stat=statSync(resolve(".env.local"));
    config=parseEnv();
  } catch {
    reasons.push("Private .env.local configuration is absent or unreadable");
  }
  if(!stat||stat.mtimeMs<=exposureTime) reasons.push("API key file predates known exposure / rotation checkpoint");
  if(process.env.CLOCKED_ROTATED_KEY_CONFIRMED!=="YES") reasons.push("key rotation has not been explicitly confirmed");
  if(process.env.CLOCKED_PROVIDER_HARD_CAP_CONFIRMED!=="YES") reasons.push("upstream account hard spend cap is not confirmed");
  const hard=Number(process.env.CLOCKED_PROVIDER_HARD_CAP_USD);
  if(!Number.isFinite(hard)||hard<=0||hard>LIMIT.costUsd) reasons.push("upstream cap must be attested as <= $0.05");
  if(!config.CLOCKED_API_KEY?.startsWith("clk_")) reasons.push("server-side Clocked key missing or invalid format");
  if(reasons.length) {
    console.log("LIVE_PREFLIGHT_BLOCKED "+JSON.stringify({reasons,requestsMade:0,costUsd:0}));
    process.exit(2);
  }
  return config.CLOCKED_API_KEY;
}
function emit(name,data) {console.log(name+" "+JSON.stringify(data));}
function compilePolicyRuntime() {
  const temp=mkdtempSync(join(tmpdir(),"clocked-synthetic-validation-"));
  for(const moduleName of ["pipeline","evidence","policy","privacy","case-context","statement-coverage"]) {
    const input=readFileSync(resolve("lib",moduleName+".ts"),"utf8");
    const js=ts.transpileModule(input,{
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
      fileName:moduleName+".ts",
    }).outputText.replace(/from\s+(["'])\.\/([a-z-]+)\1/g,(_,q,name)=>"from "+q+"./"+name+".mjs"+q);
    writeFileSync(join(temp,moduleName+".mjs"),js,"utf8");
  }
  return {temp,entry:join(temp,"pipeline.mjs")};
}
function makeMock() {
  let calls=0;
  const basic = async (endpoint,input) => {
    calls++;
    if(calls>LIMIT.endpointCalls)throw Error("OVER_CALL_LIMIT");
    const text=input.text??input.state??"";
    if(endpoint==="pii")return {data:{anonymized_text:text}};
    if(endpoint==="injection")return {data:{injection:0.001,threshold:0.5,verdict:"benign"}};
    if(endpoint==="extract") {
      const values={
        order_id:"ORD-90017",product:"Aurora Desk Lamp",delivery_date:"2026-11-01",
        condition:"unused and unopened",request:"I want a refund",
      };
      const fields={};
      for(const [name,value]of Object.entries(values)){
        const start=text.indexOf(value);
        if(start<0)throw Error("BROKEN_MOCK_FIXTURE");
        fields[name]={value,start:[...text.slice(0,start)].length,end:[...text.slice(0,start+value.length)].length,p_verify:0.999};
      }
      return {data:{fields}};
    }
    if(endpoint==="decide")return {data:{answers:{
      refund_requested:{type:"noul",noul:0.999},
      item_explicitly_unused:{type:"noul",noul:0.999},
      damaged_or_defective:{type:"noul",noul:0.001},
    }}};
    throw Error("UNEXPECTED_MOCK_ENDPOINT");
  };
  const services=Object.fromEntries(["pii","injection","extract","decide"].map(name=>[name,input=>basic(name,input)]));
  return {services,count:()=>calls};
}
function makeMeteredClient(apiKey) {
  const sdk=new Clocked({apiKey,maxAttempts:1,timeout:30000});
  const meter={calls:0,costUsd:0,credits:0,costBasis:[],entries:[]};
  // The application normally runs Extract and Decide concurrently.
  // For a budget audit we serialize these provider calls so a cost threshold
  // discovered after Extract stops Decide before it can create another bill.
  let previous=Promise.resolve();
  function invoke(name,input) {
    const pending=previous.then(async()=>{
    if(meter.calls>=LIMIT.endpointCalls)throw Error("HARD_ENDPOINT_CALL_LIMIT");
    if(meter.costUsd>=LIMIT.costUsd)throw Error("COST_STOP_THRESHOLD_REACHED");
    meter.calls++;
    try {
      const result=await sdk[name](input,{maxAttempts:1,timeout:30000});
      if(result.attempts!==1)throw Error("UNEXPECTED_RETRY");
      if(typeof result.costUsd!=="number"||typeof result.credits!=="number"||!result.costBasis)
        throw Error("COST_TELEMETRY_MISSING");
      meter.costUsd+=result.costUsd;
      meter.credits+=result.credits;
      meter.costBasis.push(result.costBasis);
      meter.entries.push({endpoint:name,costUsd:result.costUsd,credits:result.credits,basis:result.costBasis});
      if(["mixed","overage"].includes(result.costBasis))throw Error("OVERAGE_DETECTED_STOP");
      if(meter.costUsd>LIMIT.costUsd)throw Error("COST_THRESHOLD_EXCEEDED_STOP");
      return result;
    } catch(error) {
      emit("PROVIDER_STAGE_STOP",{stage:name,errorType:error?.name??"UnknownError",httpStatus:error?.status??null});
      throw Error("LIVE_PROVIDER_REQUEST_FAILED");
    }
    });
    previous=pending.then(()=>undefined,()=>undefined);
    return pending;
  }
  const services=Object.fromEntries(["pii","injection","extract","decide"].map(name=>[name,input=>invoke(name,input)]));
  return {services,meter};
}
async function main(){
  emit("VALIDATION_POLICY",{mode:live?"live":"offline-dry-run",...LIMIT,syntheticOnly:true,noRetries:true,liveKeyValuesLogged:false});
  // Do not transpile or load secrets if the preflight fails.
  const apiKey=live?livePreflight():null;
  const {temp,entry}=compilePolicyRuntime();
  try {
    const {triageWithClocked}=await import(pathToFileURL(entry).href);
    const client=live?makeMeteredClient(apiKey):makeMock();
    const results=[];
    for(const item of CASES) {
      const result=await triageWithClocked(client.services,item.message,"2026-11-09");
      const safe=result.lane===item.expected || (item.expected==="approve"&&result.lane==="review");
      const expectedStrict=result.lane===item.expected;
      results.push({id:item.id,expected:item.expected,actual:result.lane,safe,expectedStrict});
      emit("SYNTHETIC_CASE",{...results.at(-1)});
      if(!safe)break;
    }
    const requests=live?client.meter.calls:client.count();
    const billed=live?client.meter.costUsd:0;
    emit("VALIDATION_SUMMARY",{mode:live?"live":"dry-run",casesCompleted:results.length,
      stageRequests:requests,credits:live?client.meter.credits:0,costUsd:billed,
      costBasis:live?client.meter.costBasis:[],
      strictMatches:results.filter(x=>x.expectedStrict).length,
      safe:results.every(x=>x.safe),withinCallCap:requests<=LIMIT.endpointCalls});
    if(results.length!==CASES.length||results.some(x=>!x.safe))process.exitCode=1;
  } finally {rmSync(temp,{recursive:true,force:true});}
}
await main().catch(error=>{
  emit("VALIDATION_STOP",{errorType:error?.message??"UnknownError"});
  process.exitCode=1;
});
