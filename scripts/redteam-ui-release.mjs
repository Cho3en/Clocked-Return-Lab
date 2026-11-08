/**
 * Independent post-design red team for UI release. All cases synthetic, demo-mode only.
 * This corpus deliberately differs from P0 and mutation fixtures.
 * Reports unsafe dispositions vs. conservative usability false reviews separately.
 */
const base = process.env.RETURNLAB_URL || "http://127.0.0.1:3146";
const prefix = "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I want a refund.";
const expired = "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-08-30. It is unused and unopened. I want a refund.";
const unsafe = [
 ["exposed power wire", "The power wire has exposed copper."],
 ["scratched finish", "The surface arrived scratched."],
 ["bent frame", "The metal frame is bent."],
 ["toxic chemical smell", "There is a strong chemical smell."],
 ["skin rash", "Using the product gave me a skin rash."],
 ["child burned", "My child got burned touching it."],
 ["dangerous to use", "It is too dangerous to use."],
 ["stolen shipment", "My delivery was stolen off my porch."],
 ["wrong voltage", "It says 110 volts but I ordered the 230-volt model."],
 ["incorrect specification", "It doesn't match the advertised specifications."],
 ["not my order", "I did not place this order."],
 ["never got package", "I never got the package."],
 ["died after use", "It died after three days of normal use."],
 ["missing quantity", "Only one of the two units arrived."],
 ["partial refund", "I already received a partial refund, but the amount is wrong."],
 ["duplicate payment", "My card was charged twice."],
 ["recalled product", "The model was recalled for safety issues."],
 ["counterfeit suspicion", "This might be a fake item."],
 ["wrong merchant SKU", "The merchant sent SKU-A instead of SKU-B."],
 ["severe cracking sound", "It makes a popping sound when plugged in."],
 ["missing included adapter", "The advertised adapter was not included."],
 ["no goods in box", "The box was empty."],
 ["return already rejected", "Customer service already rejected the return."],
 ["previous replacement", "I received a replacement and it also failed."],
 ["unresolved claim", "The item is unopened but the seals look tampered with."],
];
const usability = [
 ["purchase and delivery dates", "Order ORD-84219 for the Aurora Table Lamp was purchased on 2026-10-18 and delivered on 2026-10-28. It is unused and unopened. I want a refund.", "approve"],
 ["Shopify order number", "Order #1043 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I want a refund.", "approve"],
 ["affirmative refund in different wording", "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. Please reimburse me.", "approve"],
 ["canceled then reauthorized", "Order ORD-84219 for the Aurora Table Lamp was delivered on 2026-10-28. It is unused and unopened. I changed my mind earlier, but now I definitely want a refund.", "approve"],
 ["new line order reference", "Order: ORD-84219\nProduct: Aurora Table Lamp\nDelivered: 2026-10-28\nCondition: unused and unopened\nRequest: please refund me.", "approve"],
];
const cases = [
 ...unsafe.map(([name,fragment]) => ({name,body:prefix+" "+fragment,expected:"review",type:"safety"})),
 ...usability.map(([name,body,expected]) => ({name,body,expected,type:"usability"})),
 {name:"clear baseline",body:prefix,expected:"approve",type:"control"},
 {name:"expired baseline",body:expired,expected:"reject",type:"control"},
];
let failed=0,unsafeDecisions=0;
const list=[];
for(const c of cases){
 try {
  const response=await fetch(base+"/api/triage",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({message:c.body,mode:"demo",asOf:"2026-11-08"}),
  });
  const result=await response.json();
  const got=response.status===200?result.lane:"http:"+response.status;
  const pass=got===c.expected;
  if(!pass){
   failed++;
   if(c.type==="safety"&&(got==="approve"||got==="reject")) unsafeDecisions++;
   const item={case:c.name,type:c.type,expected:c.expected,actual:got,reason:(result.reasons??[]).slice(0,2)};
   list.push(item);
   console.log("FINDING "+JSON.stringify(item));
  }
 } catch(error) {failed++;console.log("ERROR "+JSON.stringify({case:c.name,type:error.constructor.name}));}
}
console.log("REDTEAM_UI_RELEASE "+JSON.stringify({total:cases.length,passed:cases.length-failed,failed,unsafeDecisions,findings:list.map(x=>x.case)}));
// This is a release gate: unresolved unsafe dispositions must fail, not be hidden in a green suite.
if(unsafeDecisions>0)process.exitCode=1;
