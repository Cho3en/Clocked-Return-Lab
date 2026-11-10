import type { EvidenceField } from "./types";
import { hasCurrentRefundRequest } from "./refund-intent";
import { checkSafeStatementCoverage, isProductAmbiguous } from "./statement-coverage";

/**
 * Deterministic safeguards around AI output. A highlighted field is text evidence,
 * not proof of purchase, and independently correct fields may refer to different orders.
 * Unresolved identity / temporal conflicts always require human review.
 */
export type CurrentIntent = "refund" | "return-only" | "exchange" | "support" | "withdrawn" | "speculative" | "ambiguous" | "none";

export interface CaseScope {
  orderRefs: string[];
  deliveryDates: string[];
  intent: CurrentIntent;
  issueSignals: string[];
  blockers: string[];
  identityBlockers: string[];
  linkedOrderId: string | null;
  unclassifiedStatements: number;
  coherent: boolean;
}

const quoted = /"[^"\n]{3,}"|“[^”\n]{3,}”|(^|[\s([:])'[^'\n]{5,}'(?=\s|[,.!?]|$)/gm;
const refundWord = /\b(?:refund|money\s+back|reimbursement|reimburse)\b/i;
const returnWord = /\b(?:return|send\s+(?:it\s+)?back)\b/i;
const exchangeWord = /\b(?:exchange|replacement|replace\s+(?:it|the\s+item))\b/i;

export function classifyCurrentIntent(text: string): CurrentIntent {
  const quoteMatches = [...text.matchAll(new RegExp(quoted.source, quoted.flags))];
  const containsQuotedRequest = quoteMatches.some((m) => /\b(?:refund|return|exchange)\b/i.test(m[0]));
  const outsideQuotes = text.replace(quoted, " ");
  const reauthorized = /\b(?:i\s+)?changed\s+my\s+mind\s+earlier,\s+but\s+now\s+i\s+(?:definitely\s+)?(?:want|need|request)\s+(?:a\s+)?refund\b/i.test(outsideQuotes);
  const withdrawn = /\b(?:changed\s+my\s+mind|withdraw(?:ing|n)?\s+(?:my\s+)?(?:request|refund)|cancel(?:led|ed)?\s+(?:my\s+)?(?:refund|return)|no\s+longer\s+(?:want|need)|do\s+not\s+want\s+(?:a\s+)?refund|don['’]t\s+want\s+(?:a\s+)?refund|not\s+(?:requesting|asking\s+for)\s+(?:a\s+)?refund|i\s+only\s+(?:need|want)\s+(?:help|support))\b/i.test(text);
  const superseded = /\b(?:cancel\s+(?:(?:that|the|my)\s+)?(?:refund\s+)?request|nevermind|never\s+mind|decided\s+to\s+keep\s+(?:it|the\s+(?:product|item))|on\s+second\s+thought|do\s+not\s+refund\s+me|don['’]t\s+refund\s+me|only\s+quoting|quoting\s+someone|i['’]d\s+prefer\s+store\s+credit|prefer\s+store\s+credit|instead\s*,?\s*(?:please\s+)?exchange|rather\s+than\s+(?:a\s+)?refund)\b/i.test(text);
  // A return WITHOUT a refund is an active return-only request, not a
  // withdrawal of an earlier monetary request. Keep explicit cancellations
  // and quoted/historical requests above this exception.
  const activeReturnOnly = /\b(?:i|we)\s+(?:want|need|wish|would\s+like)\s+(?:to\s+)?(?:return|send\s+(?:it|the\s+(?:item|product))?\s*back)\b/i.test(outsideQuotes)
    && /\b(?:without\s+(?:(?:asking\s+for|requesting|getting)\s+)?(?:a\s+)?refund|(?:do\s+not|don't|don’t)\s+(?:want|need)\s+(?:a\s+)?refund|no\s+refund\s+(?:needed|requested|wanted)|not\s+(?:requesting|asking\s+for)\s+(?:a\s+)?refund)\b/i.test(outsideQuotes);
  const explicitCancellation = /\b(?:cancel(?:led|ed|ing)?\s+(?:my|that|the)?\s*(?:refund|return)\s*(?:request)?|withdraw(?:n|ing)?\s+(?:my|the)?\s*(?:refund|request)|changed\s+my\s+mind|no\s+longer\s+(?:want|need)|never\s+mind)\b/i.test(outsideQuotes);
  if (!containsQuotedRequest && activeReturnOnly && !explicitCancellation) return "return-only";
  if (containsQuotedRequest || ((withdrawn || superseded) && !reauthorized)) return "withdrawn";
  if (reauthorized) return "refund";

  const denialOfRefund = /\b(?:without\s+(?:asking\s+for|requesting|getting|a|any)\s+(?:a\s+)?refund|no\s+refund\s+(?:needed|requested|wanted)|not\s+(?:asking\s+for|requesting|seeking)\s+(?:a\s+)?refund|(?:do\s+not|don['’]t)\s+(?:need|want)\s+(?:a\s+)?refund)\b/i.test(outsideQuotes);
  const conditional = /\b(?:if\s+it\s+(?:arrives|is|becomes)|if\s+the\s+(?:product|item)|might\s+(?:want|need|request)|would\s+(?:consider|possibly)|in\s+the\s+future|hypothetically|what\s+if\s+i)\b/i.test(outsideQuotes);
  if (conditional) return "speculative";

  // Shared phrase table. A question such as "how do I request a refund" does
  // not start a clause, so it is not treated as a current request.
  const refundRequest = hasCurrentRefundRequest(outsideQuotes);
  if (denialOfRefund) {
    return returnWord.test(outsideQuotes) ? "return-only" : exchangeWord.test(outsideQuotes) ? "exchange" : "support";
  }
  if (refundRequest && /\b(?:refund\s+or\s+(?:an?\s+)?(?:exchange|replacement)|(?:exchange|replacement)\s+or\s+(?:an?\s+)?refund)\b/i.test(outsideQuotes)) return "ambiguous";
  if (refundRequest) return "refund";

  const affirmativeReturn = /\b(?:i|we)\s+(?:want\s+to|would\s+like\s+to|need\s+to|wish\s+to)\s+(?:return|send\s+(?:it\s+)?back)\b/i.test(outsideQuotes);
  if (affirmativeReturn) return "return-only";
  if (exchangeWord.test(outsideQuotes) && /\b(?:i|we)\s+(?:want|need|would\s+like)\b/i.test(outsideQuotes)) return "exchange";
  if (/\b(?:question|help|manual|how\s+do|how\s+to|policy|support|troubleshoot)\b/i.test(outsideQuotes)) return "support";
  if (refundWord.test(outsideQuotes) || returnWord.test(outsideQuotes)) return "ambiguous";
  return "none";
}

/** This lexicon is a conservative escalation backstop, not a substitute for merchant review. */
export function detectIssueSignals(text: string): string[] {
  // Negated simple defect descriptions must not turn a valid unused return into a defect claim.
  const clean = text.replace(/\b(?:battery|cell|power\s+pack)\s+(?:(?:is|was)\s+)?(?:not|never)\s+(?:swollen|swelling|bulging|leaking|puffed|expanded|expanding)\b|\b(?:battery|cell|power\s+pack)\s+(?:isn\u0027t|wasn\u0027t)\s+(?:swollen|swelling|bulging|leaking|puffed|expanded|expanding)\b/gi, " ")
    .replace(/\b(?:not|never|is(?:n\u0027t| not)|was(?:n\u0027t| not)|no)\s+(?:damaged|broken|defective|faulty|malfunctioning|overheating|smoking|sparking|leaking|hazardous|electrocuted)\b/gi, " ")
    .replace(/\bbut\s+now\s+i\s+(?:definitely\s+)?want\b/gi, " I want");
  const patterns: Array<[string, RegExp]> = [
    ["unsafe product", /\b(?:overheat(?:ing|s|ed)?|smok(?:e|es|ing)|sparks?|sparking|electric(?:al)?\s+shocks?|caught\s+fire|on\s+fire|burn(?:ing|t|ed)?\s+smell|smells?\s+(?:like\s+)?burn(?:t|ing)|scorched|explod(?:e|ed|ing)|battery\s+(?:(?:is|was|has\s+become|appears|looks)\s+)?(?:visibly\s+)?(?:swollen|swelling|bulging|leaking|puffed|expanded|expanding)|fire\s+hazard|safety\s+hazard|hot\s+to\s+the\s+touch|cable\s+melted|electrocut\w*|zapped|electric\s+shock|hazardous|jolt(?:s|ed|ing)?|hiss(?:es|ed|ing)?|melt(?:s|ed|ing)?|sting(?:s|ing|ung)?|bit(?:e|es|ing|ten)|catch(?:es)?\s+fire|giv(?:e|es|ing)\s+off\s+(?:fumes?|smoke|gas|odou?r|vapou?r)|arc(?:s|ed|ing)?)\b/i],
    ["damaged or faulty", /\b(?:broken|damaged|defective|faulty|malfunctioning|falling\s+apart|fell\s+apart|stopped\s+working|does\s+not\s+work|doesn['’]t\s+work|not\s+working|cracked|shattered|leaking|leaks?|injured|injury|peeling|peels?|peeled|flaking|flaked|melted|melting|melt|buttons?\s+(?:do\s+not|does\s+not|don't|doesn't)\s+(?:work|respond))\b/i],
    ["wrong item or description", /\b(?:wrong\s+(?:item|product|size|colo[u]?r|shade|variant|model)|incorrect\s+(?:item|product|size|colo[u]?r|model)|different\s+(?:item|product|size|colo[u]?r|variant|model)|colou?r\s+is\s+(?:completely\s+)?wrong|not\s+(?:as\s+)?described|not\s+what\s+i\s+ordered|does\s+not\s+match\s+(?:the\s+)?(?:description|order))\b/i],
    ["missing or undelivered", /\b(?:missing\s+(?:parts?|items?|accessories|parcel|package)|(?:parts?|items?|accessories)\s+(?:are\s+)?missing|never\s+arrived|not\s+delivered|item\s+not\s+received|parcel\s+(?:lost|missing)|lost\s+in\s+transit|(?:package|parcel|item|shipment)\s+(?:has\s+not|hasn[\u0027’]t)\s+arrived)\b/i],
    ["consumer rights or dispute", /\b(?:consumer\s+rights|statutory\s+rights|warranty|guarantee\s+claim|chargeback|counterfeit|not\s+fit\s+for\s+purpose|misleading|unsafe|already\s+(?:returned|shipped\s+(?:it\s+)?back|sent\s+(?:it\s+)?back))\b/i],
    ["unresolved complaint or contrast", /\b(?:but|however|unfortunately|problem|complaint|the\s+issue\s+is)\b/i],
    ["missing or loose hardware", /\b(?:missing\s+(?:screws?|bolts?|components?|cables?|charger)|(?:screws?|bolts?|parts?|components?)\s+(?:are\s+)?missing|(?:screws?|bolts?|parts?)\s+(?:came|are|became)\s+loose|loose\s+(?:screws?|bolts?|parts?))\b/i],
    ["unexpected product behavior", /\b(?:crackl(?:e|es|ing)|rattl(?:e|es|ing)|smells?\s+odd|(?:will\s+not|won['’]t|does\s+not|doesn['’]t)\s+(?:turn|switch)\s+on|does\s+not\s+(?:respond|power\s+on)|won['’]t\s+start)\b/i],
    ["prior replacement or shipment", /\b(?:already\s+(?:received|got)\s+(?:a\s+)?replacement|(?:seller|shop|store)\s+promised\s+(?:to\s+)?replace|promised\s+(?:a\s+)?replacement|replacement\s+already\s+(?:received|shipped))\b/i],
    ["address mismatch", /\b(?:(?:delivery|shipping)\s+address\s+(?:was|is)\s+different|wrong\s+(?:delivery|shipping)\s+address|address\s+(?:does\s+not|doesn['’]t)\s+match)\b/i],
    ["hazard or injury report", /\b(?:exposed\s+(?:wire|copper|cable|wiring)|scratched|scratch(?:es|ed)?|bent\s+(?:frame|part|metal)|chemical\s+smell|(?:skin\s+)?rash|(?:got|was|is)\s+burn(?:ed|t)|dangerous|hazardous|poison\w*|fray\w*|electrocut\w*|unsafe\s+to\s+use|stolen|theft|recalled|recall\s+notice|counterfeit|fake\s+item|strong\s+(?:chemical\s+)?odou?r|tampered\s+with|wiring\s+is\s+(?:coming|falling)\s+apart|turns?\s+off\s+unexpectedly|turns\s+itself\s+off)\b/i],
    ["product or quantity discrepancy", /\b(?:doesn['’]t\s+match|does\s+not\s+match|advertised\s+specifications?|not\s+included|box\s+(?:was|is)\s+empty|(?:only\s+)?one\s+of\s+(?:the\s+)?two\s+(?:units?|items?)\s+arrived|wrong\s+voltage|SKU-[\w-]+\s+instead\s+of\s+SKU-[\w-]+|(?:seller|merchant)\s+sent\s+SKU-[\w-]+\s+instead\s+of|popping\s+sound|died\s+after|never\s+(?:got|received)\s+(?:the\s+)?(?:package|parcel)|return\s+(?:was\s+)?already\s+rejected|received\s+(?:a\s+)?replacement)\b/i],
    ["billing exception", /\b(?:card\s+(?:was\s+)?charged\s+twice|charged\s+twice|double[\s-]charged|duplicate\s+(?:charge|payment|billing)|partial\s+refund|(?:refund|credit)\s+amount\s+(?:is|was)\s+wrong)\b/i],
    ["other mismatch or safety warning", /\b(?:getting\s+(?:extremely\s+|too\s+|very\s+)?hot|hot\s+to\s+(?:the\s+)?touch|(?:sharp|dangerously\s+sharp)\s+edges?|cut\s+my\s+(?:hand|finger)|dimensions?\s+(?:do(?:es)?\s+not|don[\u0027’]t)\s+match|incorrect\s+(?:variant|colour|color)|(?:ordered|selected|chose)[^.!?\n]{0,90}\bbut\s+(?:received|got)|wrong\s+dimensions?)\b/i],
  ];
  return patterns.filter(([,pattern])=>pattern.test(clean)).map(([label])=>label);
}
export function hasIssue(text: string): boolean { return detectIssueSignals(text).length > 0; }

function normalizeOrderRef(ref: string): string {
  return ref.toUpperCase().replace(/\s+/g, "").replace(/^ORDER#/, "#");
}
export function findOrderRefs(text: string): string[] {
  const refs = new Set<string>();
  for (const match of text.matchAll(/\bORD-[A-Z0-9-]{4,35}\b/gi)) refs.add(normalizeOrderRef(match[0]));
  for (const match of text.matchAll(/\border\s*#\s*(\d{3,18})\b/gi)) refs.add("#"+match[1]);
  for (const match of text.matchAll(/(?:^|[^\w])#(\d{4,18})\b/g)) refs.add("#"+match[1]);
  return [...refs];
}
function explicitProductAmbiguity(text: string): boolean {
  return /\b(?:another|second|different|other)\s+(?:product|item|order)\b|\b(?:both|two|multiple|several)\s+(?:products|items|orders)\b|\b(?:separately|on\s+another\s+order)\b/i.test(text);
}
/**
 * All high-stakes cases need a single, self-consistent order and claimed delivery date.
 * Distinct IDs/dates always block automatic recommendations; corrections need human resolution.
 * This is an abstention model, not a system of record for real merchandise.
 */
export function inspectCaseScope(text: string, evidence: EvidenceField[] = []): CaseScope {
  const orderRefs = findOrderRefs(text);
  // Only DELIVERY dates are compared. Purchase/order/invoice dates are metadata,
  // not proof of a conflicting delivery. Explicit delivery corrections still block.
  const claimedDeliveries = [
    ...[...text.matchAll(/\b(?:delivered|delivery(?:\s+date)?|received|arrived)\s+(?:(?:was|is)\s+)?(?:on\s+)?(?:the\s+)?(\d{4}-\d{2}-\d{2})\b/gi)].map(m=>m[1]),
    ...[...text.matchAll(/\b(?:delivery\s*date|delivered)\s*:\s*(\d{4}-\d{2}-\d{2})\b/gi)].map(m=>m[1]),
  ];
  const deliveryDates = [...new Set(claimedDeliveries)];
  const intent = classifyCurrentIntent(text);
  const issueSignals = detectIssueSignals(text);
  // An extracted product span that absorbs a clause/event is itself an
  // exception signal, even when the lexicon misses its exact wording and
  // even when an extracted product in live mode is clean but the raw
  // statement was already flagged by statement coverage.
  const productField = evidence.find((e)=>e.id==="product");
  if (productField && isProductAmbiguous(productField.value) && !issueSignals.includes("ambiguous product description")) {
    issueSignals.push("ambiguous product description");
  }
  const blockers: string[] = [];
  const identityBlockers: string[] = [];
  if (orderRefs.length !== 1) identityBlockers.push(
    orderRefs.length > 1 ? "Multiple distinct order references need separate human attribution." : "A unique order reference is required.",
  );
  if (deliveryDates.length !== 1) identityBlockers.push(
    deliveryDates.length > 1 ? "Conflicting dates or corrections need human reconciliation." : "A single, explicit delivery date is required.",
  );
  if (explicitProductAmbiguity(text)) identityBlockers.push("Multiple or ambiguous products require product-level attribution.");
  if (/\b(?:did\s+not|didn[\u0027’]t)\s+place\s+(?:this|the)\s+order\b/i.test(text)) identityBlockers.push("Customer disputes having placed this order.");
  if (/\b(?:actually\s+belongs?\s+to\s+my|order\s+(?:is|was)\s+not\s+mine|placed\s+by\s+(?:someone\s+else|my|a\s+friend)|not\s+my\s+order)\b/i.test(text)) identityBlockers.push("Ownership or ordering identity is disputed.");
  const orderField = evidence.find((e)=>e.id==="order_id");
  if (orderField && orderRefs.length===1 && normalizeOrderRef(orderField.value)!==orderRefs[0]) {
    identityBlockers.push("Extracted order reference does not match the only order in the message.");
  }
  const dateField = evidence.find((e)=>e.id==="delivery_date");
  if (dateField && deliveryDates.length===1 && dateField.value!==deliveryDates[0]) {
    identityBlockers.push("Extracted delivery date conflicts with the message.");
  }
  blockers.push(...identityBlockers);
  if (intent !== "refund") blockers.push(
    intent==="return-only" ? "Customer requests a return without clear refund authorization." :
    intent==="withdrawn" ? "Quoted, historical or withdrawn refund intent needs human confirmation." :
    intent==="speculative" ? "Conditional or speculative request is not a current refund authorization." :
    intent==="exchange" ? "Exchange requires a different workflow from refund authorization." :
    "A current, affirmative refund request is not established.",
  );
  if (issueSignals.length) blockers.push("Reported defect, product, billing, delivery, rights or safety issue requires human review: "+issueSignals.join(", ")+".");
  // An unrecognized message clause can be a problem our finite exception
  // lexicon and the provider model both failed to detect. Fail closed.
  const coverage = checkSafeStatementCoverage(text);
  if (coverage.unknownCount) blockers.push(
    "Unclassified customer statements ("+coverage.unknownCount+") need human review; absence of a detected defect is not evidence of no defect.",
  );
  return {orderRefs,deliveryDates,intent,issueSignals,blockers,identityBlockers,
    linkedOrderId:identityBlockers.length===0?orderRefs[0]:null,
    unclassifiedStatements:coverage.unknownCount,coherent:blockers.length===0};
}
