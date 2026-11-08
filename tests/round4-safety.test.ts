import { describe, expect, it, vi } from "vitest";
import { triageDemo } from "../lib/demo";
import { triageWithClocked, type ClockedServices } from "../lib/pipeline";
import { evaluatePolicy } from "../lib/policy";
import type { Assessment, EvidenceField } from "../lib/types";

const day = "2026-11-08";
const prefix = "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I want a refund.";
const expired = "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-08-30. It is unused and unopened. I want a refund.";

const unsafe = [
  ["exposed wire", "The power wire has exposed copper."],
  ["scratched surface", "The surface arrived scratched."],
  ["bent metal frame", "The metal frame is bent."],
  ["chemical smell", "There is a strong chemical smell."],
  ["skin rash", "Using the product gave me a skin rash."],
  ["child burned", "My child got burned touching it."],
  ["dangerous item", "It is too dangerous to use."],
  ["stolen delivery", "My delivery was stolen off my porch."],
  ["wrong power model", "It says 110 volts but I ordered the 230-volt model."],
  ["doesn't match specs", "It doesn't match the advertised specifications."],
  ["identity denied", "I did not place this order."],
  ["never got package", "I never got the package."],
  ["died after use", "It died after three days of normal use."],
  ["wrong quantity", "Only one of the two units arrived."],
  ["partial refund discrepancy", "I already received a partial refund, but the amount is wrong."],
  ["duplicate charge", "My card was charged twice."],
  ["recalled product", "The model was recalled for safety issues."],
  ["fake item", "This might be a fake item."],
  ["wrong SKU", "The merchant sent SKU-A instead of SKU-B."],
  ["popping noise", "It makes a popping sound when plugged in."],
  ["missing adapter", "The advertised adapter was not included."],
  ["empty parcel", "The box was empty."],
  ["previous rejection", "Customer service already rejected the return."],
  ["replacement failed", "I received a replacement and it also failed."],
  ["tampered seals", "The item is unopened but the seals look tampered with."],
] as const;

const positive = [
  ["baseline",prefix],
  ["Shopify order", "Order #1043 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I want a refund."],
  ["separate purchase and delivery", "Order ORD-84219 for the Aurora Table Lamp was purchased on 2026-10-18 and delivered on 2026-10-28. It is unused and unopened. I want a refund."],
  ["reimburse phrasing", "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. Please reimburse me."],
  ["new line structure", "Order: ORD-84219\nProduct: Aurora Table Lamp\nDelivered: 2026-10-28\nCondition: unused and unopened\nRequest: please refund me."],
  ["renewed current request", "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I changed my mind earlier, but now I definitely want a refund."],
] as const;

function evidenceFor(text: string, order = "ORD-84219", date = "2026-10-28"): EvidenceField[] {
  const fields: Record<string, string> = {
    order_id: order,
    product: "Aurora Table Lamp",
    delivery_date: date,
    condition: "unused and unopened",
    request: "I want a refund",
  };
  return Object.entries(fields).map(([id,value])=>{
    const start=text.indexOf(value);
    if(start<0) throw new Error("Invalid synthetic evidence fixture: "+id);
    return {id,label:id,value,start,end:start+value.length,confidence:0.999};
  });
}
const falseNegativeAssessments: Assessment[] = [
  {id:"refund_requested",label:"Refund",answer:true,probability:0.999},
  {id:"item_explicitly_unused",label:"Unused",answer:true,probability:0.999},
  {id:"damaged_or_defective",label:"Issue",answer:false,probability:0.001},
];

function mockedClocked(message: string, options?: { guard?: "pass" | "fail" | "ambiguous"; forceLowConfidence?: boolean }) {
  const order = "ORD-84219";
  const fields = evidenceFor(message,order,message.includes("2026-08-30") ? "2026-08-30" : "2026-10-28");
  const calls: string[]=[];
  const pii=vi.fn(async()=>{calls.push("protect");return {data:{anonymized_text:message}};});
  const injection=vi.fn(async()=>{calls.push("guard");return {data:{
    injection:options?.guard==="fail"?0.95:options?.guard==="ambiguous"?0.47:0.001,
    threshold:0.5,
  }};});
  const extract=vi.fn(async({text}:{text:string})=>{
    calls.push("extract");
    const returned: Record<string,unknown> = {};
    for(const f of fields) {
      const span=text.indexOf(f.value);
      if(span<0) throw new Error("The synthetic request unexpectedly lost evidence "+f.id);
      const prefixLength=[...text.slice(0,span)].length;
      returned[f.id]={value:f.value,start:prefixLength,end:prefixLength+[...f.value].length,
        p_verify:options?.forceLowConfidence?0.02:0.999};
    }
    return {data:{fields:returned}};
  });
  const decide=vi.fn(async()=>{
    calls.push("decide");
    return {data:{answers:{
      refund_requested:{type:"noul",noul:0.999},
      item_explicitly_unused:{type:"noul",noul:0.999},
      // Deliberately INCORRECT NO: policy must still abstain.
      damaged_or_defective:{type:"noul",noul:0.001},
    }}};
  });
  const client = {pii,injection,extract,decide} as unknown as ClockedServices;
  return {client,calls,pii,injection,extract,decide};
}

describe("Round 4: previously unsafe approvals become human review", ()=>{
  it.each(unsafe)("%s -> review (deterministic demo)", (_label, fragment)=>{
    const result=triageDemo(prefix+" "+fragment,day);
    expect(result.lane).toBe("review");
    expect(result.checks.find(c=>c.label==="Message context coverage")?.status === "unknown"
      || (result.caseScope?.issueSignals.length??0)>0).toBe(true);
  });
  it.each(unsafe)("%s -> review (mocked live, false-negative Decide)", (_label, fragment)=>{
    const text=prefix+" "+fragment;
    const result=evaluatePolicy({mode:"live",redactedText:text,evidence:evidenceFor(text),
      assessments:falseNegativeAssessments,asOf:day,requestId:"MOCK",injectionFlag:false});
    expect(result.lane).toBe("review");
  });
  it.each(positive)("%s remains eligible in deterministic demo",(_label,body)=>{
    expect(triageDemo(body,day).lane).toBe("approve");
  });
  it("old clean request remains advisory decline in demo and mock-live policy",()=>{
    expect(triageDemo(expired,day).lane).toBe("reject");
    expect(evaluatePolicy({mode:"live",redactedText:expired,evidence:evidenceFor(expired,"ORD-84219","2026-08-30"),
      assessments:falseNegativeAssessments,asOf:day,requestId:"MOCK",injectionFlag:false}).lane).toBe("reject");
  });
});

describe("Round 4: actual Clocked pipeline ordering with controlled synthetic provider responses", ()=>{
  it.each([
    ["wiring injury","The wiring is frayed and burned my fingers."],
    ["unusual contaminant","A strange sticky substance leaked from the carton."],
    ["refund discrepancy","I have a duplicate payment showing on my statement."],
    ["supplier substitution","They substituted a different model without asking me."],
    ["unexpected shipment","The courier delivered this to someone else."],
    ["packaging fault","The item came in a ripped bag with no protective padding."],
    ["non-functioning device","It gives off a grinding noise and shuts itself down."],
    ["unrecognized complaint","I am writing to dispute the quality of this product."],
  ])("%s -> review even with very confident false-negative model",async (_name,fragment)=>{
    const text=prefix+" "+fragment;
    const mock=mockedClocked(text);
    const result=await triageWithClocked(mock.client,text,day);
    expect(result.mode).toBe("live");
    expect(result.lane).toBe("review");
    expect(mock.calls).toEqual(["protect","guard","extract","decide"]);
    expect(result.caseScope?.unclassifiedStatements || result.caseScope?.issueSignals.length).toBeTruthy();
  });
  it("confident clean control may approve, and customer-reported older case may decline",async()=>{
    for(const [text,lane] of [[prefix,"approve"],[expired,"reject"]] as const) {
      const mock=mockedClocked(text);
      const result=await triageWithClocked(mock.client,text,day);
      expect(result.lane).toBe(lane);
      expect(result.caseScope?.unclassifiedStatements).toBe(0);
      expect(mock.calls).toEqual(["protect","guard","extract","decide"]);
    }
  });
  it("failed and ambiguous Guard results prevent Extract and Decide",async()=>{
    for(const guard of ["fail","ambiguous"] as const){
      const mock=mockedClocked(prefix,{guard});
      const result=await triageWithClocked(mock.client,prefix,day);
      expect(result.lane).toBe("review");
      expect(mock.extract).not.toHaveBeenCalled();
      expect(mock.decide).not.toHaveBeenCalled();
    }
  });
  it("low confidence evidence cannot authorize an approval",async()=>{
    const mock=mockedClocked(prefix,{forceLowConfidence:true});
    const result=await triageWithClocked(mock.client,prefix,day);
    expect(result.lane).toBe("review");
  });
});
