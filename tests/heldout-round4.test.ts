/**
 * Independent, post-repair holdout: NOT part of the earlier 32-case or
 * 76-case corpora. All messages are synthetic. No Clocked API calls.
 *
 * The live branch is given deliberately optimistic, WRONG model output:
 * all facts extracted with exact source offsets, p_verify=0.999, and
 * damage=no with p(no damage)=0.999. Deterministic safeguards must prevail.
 */
import {describe, expect, it} from "vitest";
import {triageDemo} from "../lib/demo";
import {evaluatePolicy} from "../lib/policy";
import type {Assessment, EvidenceField} from "../lib/types";

const asOf="2026-11-08";
const fragments = [
  ["fire warning label","The safety label warned of a fire risk."],
  ["frayed insulation","Insulation is frayed and copper is showing."],
  ["glass chips","There are chips along the glass edge."],
  ["pulsing electronics","The electronics pulse erratically when powered."],
  ["strange odor","The lamp emits an unusual petroleum odor."],
  ["refund amount dispute","The amount returned to my card was less than promised."],
  ["tax inconsistency","VAT charged on the receipt is incorrect."],
  ["duplicate invoice","The merchant created a duplicate invoice."],
  ["wrong finish","I ordered brushed silver but received polished chrome."],
  ["courier dispute","The tracking says delivered but nothing was left at the address."],
  ["unauthorized purchase","I never authorized this purchase."],
  ["unexpected payment","An unexpected fee appeared on the invoice."],
  ["defect wording","The power switch keeps flickering intermittently."],
  ["broken shipment","The carton arrived crushed and wet."],
  ["damaged packaging","The package seal was sliced open."],
  ["return rejected","The returns department refused to accept the item."],
  ["changed product","The seller replaced it with a cheaper substitute."],
  ["missing instruction manual","The required instruction booklet wasn't inside."],
  ["rash described differently","The device left red itchy patches on my skin."],
  ["existing store credit","You already gave me store credit for this return."],
  ["refund cancelled","I previously stopped the refund with customer service."],
  ["refurbished instead of new","I paid for new condition but received refurbished stock."],
  ["delivery inconsistency","The carrier marked delivered despite a failed drop-off."],
  ["dangerous support request","The plug feels electrified when I touch it."],
  ["unverified extra detail","Something strange happened to the item after unboxing."],
  ["previous damage claim","I previously complained about scratches on this item."],
  ["name introduction attack","I am writing to complain about the workmanship."],
  ["fake introduction attack","Hi, I am trying to dispute the transaction."],
] as const;

const variants = [
  {name:"inside window",date:"2026-10-25",cleanLane:"approve" as const},
  {name:"outside window",date:"2026-08-15",cleanLane:"reject" as const},
];
function source(date:string) {
  return "Order ORD-55302 for the Copper Pendant was delivered on "+date+
    ". It is unused and unopened. I want a refund.";
}
function evidence(text:string,date:string):EvidenceField[]{
  const values:Record<string,string>={
    order_id:"ORD-55302",product:"Copper Pendant",delivery_date:date,
    condition:"unused and unopened",request:"I want a refund",
  };
  return Object.entries(values).map(([id,value])=>{
    const start=text.indexOf(value);
    if(start<0) throw new Error("Broken test fixture "+id);
    return{id,label:id,value,start,end:start+value.length,confidence:0.999};
  });
}
const wrongModel:Assessment[]=[
  {id:"refund_requested",label:"Refund",answer:true,probability:0.999},
  {id:"item_explicitly_unused",label:"Unused",answer:true,probability:0.999},
  {id:"damaged_or_defective",label:"Defect",answer:false,probability:0.001},
];
for(const variant of variants){
  describe("New holdout, "+variant.name,()=>{
    const base=source(variant.date);
    it("accepts an unambiguous positive control without falsely escalating everything",()=>{
      expect(triageDemo(base,asOf).lane).toBe(variant.cleanLane);
      const result=evaluatePolicy({mode:"live",redactedText:base,evidence:evidence(base,variant.date),
        assessments:wrongModel,asOf,requestId:"HOLDOUT",injectionFlag:false});
      expect(result.lane).toBe(variant.cleanLane);
      expect(result.caseScope?.unclassifiedStatements).toBe(0);
    });
    it.each(fragments)("%s is review in deterministic demo",(_name,fragment)=>{
      const result=triageDemo(base+" "+fragment,asOf);
      expect(result.lane).toBe("review");
    });
    it.each(fragments)("%s is review despite wrong, high-confidence mocked live verdict",(_name,fragment)=>{
      const text=base+" "+fragment;
      const result=evaluatePolicy({mode:"live",redactedText:text,evidence:evidence(text,variant.date),
        assessments:wrongModel,asOf,requestId:"HOLDOUT",injectionFlag:false});
      expect(result.lane).toBe("review");
      expect(result.caseScope?.blockers.length).toBeGreaterThan(0);
    });
  });
}
describe("Cross-boundary holdout",()=>{
  it("requires review when approval facts belong to a different request",()=>{
    const text=source("2026-10-25")+" For my second order ORD-55303 I need a refund.";
    const result=evaluatePolicy({mode:"live",redactedText:text,evidence:evidence(text,"2026-10-25"),
      assessments:wrongModel,asOf,requestId:"SPLIT",injectionFlag:false});
    expect(result.lane).toBe("review");
  });
  it("rejects misaligned evidence even when the model is confident",()=>{
    const text=source("2026-10-25");
    const items=evidence(text,"2026-10-25");
    items[0]={...items[0],start:0,end:9};
    const result=evaluatePolicy({mode:"live",redactedText:text,evidence:items,
      assessments:wrongModel,asOf,requestId:"SPAN",injectionFlag:false});
    expect(result.lane).toBe("review");
  });
  it("injection guard unknown blocks clean messages",()=>{
    const text=source("2026-10-25");
    const result=evaluatePolicy({mode:"live",redactedText:text,evidence:evidence(text,"2026-10-25"),
      assessments:wrongModel,asOf,requestId:"GUARD",injectionFlag:null});
    expect(result.lane).toBe("review");
  });
});
