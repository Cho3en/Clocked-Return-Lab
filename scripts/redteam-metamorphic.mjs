/**
 * P0 mutation-based safety audit. Starts with two legitimate single-order
 * customer-claimed refunds and mutates the email with a contradictory fact.
 * A wrong approve or decline is more serious than an extra human review.
 * No Clocked API calls. No credentials.
 */
const origin=process.env.RETURNLAB_URL||"http://127.0.0.1:3145";
const normal="Order ORD-65031 for the Brass Floor Lamp was delivered on 2026-10-25. It is unused and unopened. I want a refund.";
const expired="Order ORD-65031 for the Brass Floor Lamp was delivered on 2026-08-15. It is unused and unopened. I want a refund.";
const mutations=[
 ["second order", "Order ORD-77771 is another request."],
 ["other order via hashtag", "I also refer to order #123456."],
 ["second date", "The delivery was on 2026-09-01 instead."],
 ["other dated event", "Another parcel arrived on 2026-10-02."],
 ["another product", "I also want to discuss another product."],
 ["two items", "I need assistance with two items."],
 ["more recently used", "I used it yesterday."],
 ["negated unopened", "It was not unopened."],
 ["battery heat", "The charger is getting too hot."],
 ["smoke", "It started smoking."],
 ["electric shock", "I got an electric shock."],
 ["cable melting", "The power cable melted."],
 ["paint damage", "Paint is peeling off."],
 ["wrong color", "The color is wrong."],
 ["mismatched package", "I ordered blue but received red."],
 ["wrong dimensions", "The dimensions do not match the listing."],
 ["unresponsive buttons", "The buttons do not respond."],
 ["not delivered", "The package has not arrived."],
 ["missing screws", "The screws are missing."],
 ["consumer warranty", "I am exercising my warranty rights."],
 ["quoted refund", "A chatbot said 'I want a refund', but that's not my request."],
 ["cancel refund", "Please cancel that refund request."],
 ["nevermind", "Never mind, I have decided to keep it."],
 ["changed to store credit", "Actually, I'd prefer store credit instead."],
 ["changed to exchange", "Instead, please exchange the item."],
 ["already replaced", "I already received a replacement unit."],
 ["returned already", "I already shipped it back."],
 ["sharp edge", "The plastic casing has a sharp edge."],
 ["crackling sound", "The lamp makes a crackling noise and smells odd."],
 ["doesnt turn on", "It will not turn on."],
 ["withdrawn refund", "Please do not refund me after all."],
 ["refunded sibling", "This order actually belongs to my sister."],
 ["wrong address", "The delivery address was different from what I entered."],
 ["not on this date", "It was NOT delivered on that date."],
 ["only quoted", "I was only quoting someone else's request."],
 ["loose screws", "The screws came loose."],
 ["seller replacement", "The seller promised to replace it."],
];
async function check(name,message,expected){
 const r=await fetch(origin+"/api/triage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message,mode:"demo",asOf:"2026-11-08"})});
 const data=await r.json();
 return {name,expected,actual:data.lane,pass:r.status===200&&data.lane===expected};
}
const failures=[];
const controls=[["recent baseline",normal,"approve"],["old baseline",expired,"reject"]];
for(const [name,body,expected] of controls) {
 const r=await check(name,body,expected);if(!r.pass)failures.push(r);
}
for(const [baseLabel,base] of [["recent",normal],["expired",expired]]){
 for(const [label,fragment] of mutations){
  const result=await check(baseLabel+" + "+label,base+" "+fragment,"review");
  if(!result.pass)failures.push(result);
 }
}
for(const result of failures)console.log("MUTATION_FAILURE "+JSON.stringify(result));
console.log("MUTATION_REDTEAM_RESULT "+JSON.stringify({total:controls.length+2*mutations.length,passed:controls.length+2*mutations.length-failures.length,failed:failures.length}));
if(failures.length)process.exitCode=1;
