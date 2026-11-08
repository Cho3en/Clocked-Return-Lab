/**
 * Separate adversarial challenge suite against the HTTP production build.
 * All text is synthetic. No Clocked live calls or private keys required.
 * This suite is deliberately different from the vitest regression matrix.
 */
const baseUrl = process.env.RETURNLAB_URL || "http://127.0.0.1:3145";
const core = "Order ORD-65031 for the Brass Floor Lamp was delivered on 2026-10-25. It is unused and unopened. ";
const expired = "Order ORD-65031 for the Brass Floor Lamp was delivered on 2026-08-15. It is unused and unopened. ";
const cases = [
  ["normal refund",core+"I need a refund.","approve"],
  ["explicit return-for-refund",core+"I want to return it for a refund.","approve"],
  ["customer confirmed no defect",core+"It is not damaged. Please issue a refund.","approve"],
  ["old unambiguous refund",expired+"I need a refund.","reject"],
  ["changed date inside same email",expired+"Sorry, I meant the item was delivered on 2026-10-25. I want a refund.","review"],
  ["two orders same date",core+"I also have order ORD-99019, delivered on 2026-10-25. I want a refund.","review"],
  ["quote support agent",core+'The agent wrote "I need a refund" but I am just asking about tracking.',"review"],
  ["old message quotation",core+"Yesterday I wrote 'I want a refund' but I no longer need one.","review"],
  ["refund cancellation",core+"I requested a refund earlier, please cancel the refund request.","review"],
  ["exchange OR refund",core+"I want a refund or an exchange. What are my options?","review"],
  ["return but no reimbursement",core+"I want to send it back, no refund necessary.","review"],
  ["store credit instead",core+"I want store credit rather than a refund.","review"],
  ["refund later perhaps",core+"I might request a refund next month.","review"],
  ["device hot to touch",core+"The lamp is getting extremely hot to touch. I want a refund.","review"],
  ["burnt power cable",core+"The power cable melted. I want a refund.","review"],
  ["unsafe sharp edges",core+"The lamp has dangerously sharp edges and cut my hand. I want a refund.","review"],
  ["paint peeling",core+"The paint is peeling off. I want a refund.","review"],
  ["ordered blue delivered red",core+"I ordered a blue lamp but received a red one. I want a refund.","review"],
  ["wrong dimensions",core+"The dimensions do not match the listing. I want a refund.","review"],
  ["buttons not responding",core+"The buttons do not respond. I want a refund.","review"],
  ["reported prior shipment back",core+"I already shipped it back yesterday. I want a refund.","review"],
  ["no parcel received",core+"The package has not arrived yet. I want a refund.","review"],
  ["second product unrelated",core+"I also want to ask about another product, the wall clock. I want a refund.","review"],
  ["different named product",core+"My order ORD-65031 also included another item, a charger. I want a refund.","review"],
  ["past support exchange",core+"Last week a different customer asked for a refund; I only need a user guide.","review"],
  ["safety not hazard",core+"The lamp is not smoking and not damaged. I want a refund.","approve"],
  ["repeated order identifier", "Subject: ORD-65031\n"+core+"I want a refund for ORD-65031.","approve"],
  ["repeated delivery date",core+"My delivery date was 2026-10-25. I want a refund.","approve"],
  ["refund as hypothetical",core+"What if I wanted a refund in the future?","review"],
  ["quoted customer statement",core+'The chatbot said "I want a refund", but I only want instructions.',"review"],
  ["incorrect variant",core+"The manufacturer sent the incorrect variant. I want a refund.","review"],
  ["new condition verified only by claim",core+"I have not used it. I want a refund.","approve"],
];
let failed=0;
const results=[];
for(const [name,message,expected] of cases) {
  try {
    const response = await fetch(baseUrl+"/api/triage",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({message,mode:"demo",asOf:"2026-11-08"}),
    });
    const data = await response.json();
    const passed = response.status===200 && data.lane===expected;
    if(!passed)failed++;
    const record={case:name,expected,got:data.lane??null,http:response.status,passed,why:passed?undefined:(data.reasons?.slice(0,2)??data.error)};
    results.push(record);
    if(!passed)console.log("FAIL "+JSON.stringify(record));
  } catch(error) {
    failed++;
    console.log("ERROR "+JSON.stringify({case:name,errorType:error?.constructor?.name}));
  }
}
console.log("INDEPENDENT_REDTEAM_RESULT "+JSON.stringify({total:cases.length,passed:cases.length-failed,failed,failedCases:results.filter(x=>!x.passed).map(x=>x.case)}));
if(failed)process.exitCode=1;
