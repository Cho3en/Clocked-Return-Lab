/**
 * Independent, post-repair HTTP red-team (demo-only).
 * Novel scenarios deliberately not taken from earlier corpus or fixtures.
 * Safe synthetic inputs, no Clocked API credits.
 */
const origin = process.env.RETURNLAB_URL || "http://127.0.0.1:3147";
const cases = [
 ["other battery hazard","The fuse popped unexpectedly."],
 ["injury report","The surface left blisters on my palm."],
 ["bad adhesive","A sticky black substance leaked from the housing."],
 ["product value dispute","The quoted price differs from the final invoice."],
 ["excessive charge","A second authorization is pending on my payment card."],
 ["misleading advertising","The online photograph misrepresents the physical finish."],
 ["missing component","The bracket required for assembly is absent."],
 ["damaged by shipping","The parcel was torn open during transport."],
 ["wrong personalization","The engraving is someone else's initials."],
 ["tracking inconsistency","The courier confirms delivery, but my parcel is nowhere to be found."],
 ["dangerous behavior","It emitted a bright arc of electricity while switched off."],
 ["wear and tear","The finish started deteriorating within a day."],
 ["returns dispute","Support closed the case without a decision."],
 ["buyer identity concern","My partner ordered this without my approval."],
 ["document inconsistency","The receipt lists a different product."],
 ["unknown safety","There is a loud high-pitched whine when connected."],
 ["prior repair","The seller attempted to repair this last week."],
 ["unknown technical fault","Several switches stopped responding after startup."],
 ["unusual symptom","I cannot operate it without feeling dizzy."],
 ["unexpected supplier","A different supplier fulfilled the shipment."],
];
const clean=(when)=>"Order ORD-49282 for the Lunar Desk Lamp was delivered on "+when+". It is unused and unopened. I want a refund.";
const variations=[
 {date:"2026-10-28",control:"approve",label:"recent"},
 {date:"2026-08-22",control:"reject",label:"expired"},
];
let checked=0,failures=0,unsafe=0;
async function check(label,message,expectLane) {
 const response=await fetch(origin+"/api/triage",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({mode:"demo",asOf:"2026-11-08",message}),
 });
 const body=await response.json();
 checked++;
 const actual=response.status===200?body.lane:"HTTP "+response.status;
 if(actual!==expectLane){
  failures++;
  if(actual==="approve"||actual==="reject")unsafe++;
  console.log("HELDOUT_FAILURE "+JSON.stringify({case:label,expected:expectLane,got:actual}));
 }
}
for(const variant of variations){
 const message=clean(variant.date);
 await check(variant.label+" control",message,variant.control);
 for(const [label,fragment] of cases){
  await check(variant.label+" "+label,message+" "+fragment,"review");
 }
}
console.log("INDEPENDENT_HELDOUT_HTTP "+JSON.stringify({tested:checked,passed:checked-failures,failed:failures,unsafeDecisions:unsafe}));
if(failures)process.exitCode=1;
