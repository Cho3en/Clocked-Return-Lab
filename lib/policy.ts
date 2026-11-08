import type { Assessment, EvidenceField, Mode, PolicyCheck, TriageResult } from "./types";

const WINDOW_DAYS = 30;
const MIN_LIVE_EXTRACT_CONFIDENCE = 0.75;
function parseDay(input: string | undefined): number | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const ms = Date.parse(input + "T12:00:00Z");
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === input ? ms : null;
}
export function businessDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return [read("year"), read("month"), read("day")].join("-");
}
export function elapsedDays(delivery: string | undefined, asOf: string): number | null {
  const first = parseDay(delivery);
  const second = parseDay(asOf);
  if (first === null || second === null) return null;
  return Math.round((second - first) / 86_400_000);
}
export function isUnusedClaim(text: string): boolean {
  // Extract the unambiguous claim, not simply the presence of the word "unused".
  const explicitlyNotUnused = /\b(?:not|never|isn't|wasn't)\s+(?:unused|unopened|sealed|new)\b/i.test(text);
  const withoutNegatedUse = text
    .replace(/\b(?:not|never|haven't|hasn't|hadn't|didn't|isn't|wasn't|not\s+yet)\s+(?:been\s+)?(?:used|opened|worn|tried\s+on|tested|installed)\b/gi, " ");
  const contradicts = /\b(?:used|opened|worn|tried\s+on|tested|installed|already\s+used|previously\s+used)\b/i.test(withoutNegatedUse);
  const positive = /\b(?:unused|unopened|factory\s+sealed|still\s+sealed|never\s+used|not\s+used|haven't\s+used|hasn't\s+been\s+used)\b/i.test(text);
  return positive && !explicitlyNotUnused && !contradicts;
}
export function isAffirmativeReturnRequest(text: string): boolean {
  // A question about the return policy is not a request for a refund.
  const negated = /\b(?:not|no)\s+(?:a\s+)?(?:refund|return)\b|\b(?:do\s+not|don\u0027t|never|not\s+to)\s+(?:want|need|request|ask\s+for)\b.{0,45}\b(?:refund|return)\b|\bnot\s+(?:request|asking\s+for)\s+(?:a\s+)?refund\b/i.test(text);
  if (negated) return false;
  return [
    /\b(?:i|we)\s+(?:would\s+like\s+to|want\s+to|need\s+to|wish\s+to|plan\s+to)\s+(?:return|send\s+back|request\s+(?:a\s+)?refund|get\s+(?:a\s+)?refund|obtain\s+(?:a\s+)?refund)\b/i,
    /\b(?:i|we)\s+(?:want|need|request|am\s+requesting|are\s+requesting|demand)\s+(?:a\s+)?refund\b/i,
    /\b(?:can|could|may)\s+(?:i|we)\s+(?:please\s+)?(?:get|have|request)\s+(?:a\s+)?refund\b/i,
    /\bplease\s+(?:refund|process\s+(?:a\s+)?return)\b/i,
  ].some((pattern) => pattern.test(text));
}
export function hasRightsOrIssue(text: string): boolean {
  // These negated phrases do not assert a defect.
  const filtered = text.replace(/\b(?:not|never|isn't|wasn't|no)\s+(?:damaged|broken|defective|faulty|malfunctioning)\b/gi, " ");
  return /\b(?:broken|damaged|defective|faulty|malfunctioning|stopped\s+working|does\s+not\s+work|not\s+working|warranty|consumer\s+rights|statutory\s+rights|wrong\s+item|incorrect\s+item|different\s+item|not\s+as\s+described|missing\s+(?:parts?|items?|accessories)|(?:parts?|items?|accessories)\s+(?:are\s+)?missing|never\s+arrived|not\s+delivered|item\s+not\s+received|chargeback|counterfeit|safety\s+issue)\b/i.test(filtered);
}
export function evaluatePolicy(input: {
  mode: Mode;
  redactedText: string;
  evidence: EvidenceField[];
  assessments: Assessment[];
  asOf: string;
  requestId: string;
  injectionFlag?: boolean | null;
}): TriageResult {
  const { mode, redactedText, evidence, assessments, asOf, requestId, injectionFlag = false } = input;
  const field = (id: string) => evidence.find((item) => item.id === id);
  const trusted = (id: string) => {
    const evidenceItem = field(id);
    if (!evidenceItem) return undefined;
    if (mode === "live" && (evidenceItem.confidence === null || evidenceItem.confidence < MIN_LIVE_EXTRACT_CONFIDENCE)) return undefined;
    return evidenceItem.value;
  };
  const assessment = (id: string) => assessments.find((a) => a.id === id)?.answer ?? null;
  const order = trusted("order_id");
  const product = trusted("product");
  const condition = trusted("condition");
  const request = trusted("request");
  const days = elapsedDays(trusted("delivery_date"), asOf);
  const hasOrder = Boolean(order && /^[A-Z0-9][A-Z0-9-]{4,35}$/i.test(order));
  const hasProduct = Boolean(product);
  const hasUnusedEvidence = Boolean(condition) && isUnusedClaim(condition!) && isUnusedClaim(redactedText) && assessment("item_explicitly_unused") === true;
  const wantsReturn = Boolean(request) && isAffirmativeReturnRequest(redactedText) && assessment("refund_requested") === true;
  const hasException = hasRightsOrIssue(redactedText) || assessment("damaged_or_defective") === true;
  const noExceptionEstablished = !hasException && assessment("damaged_or_defective") === false;
  const guardClear = injectionFlag === false;
  const checks: PolicyCheck[] = [
    { label: "Order reference", status: hasOrder ? "pass" : "unknown", detail: hasOrder ? order! + " (customer-reported)" : "No sufficiently grounded order reference" },
    { label: "Product identification", status: hasProduct ? "pass" : "unknown", detail: hasProduct ? product! + " (customer-reported)" : "Product needs confirmation" },
    { label: "Delivery date", status: days === null ? "unknown" : days < 0 ? "fail" : "pass", detail: days === null ? "No sufficiently grounded delivery date" : days < 0 ? "Date lies in the future" : trusted("delivery_date")! + " (customer-reported)" },
    { label: "30-day return window", status: days === null || days < 0 ? "unknown" : days <= WINDOW_DAYS ? "pass" : "fail", detail: days === null ? "Cannot calculate" : days < 0 ? "Date inconsistency" : days + " days since claimed delivery, cutoff " + WINDOW_DAYS },
    { label: "Unused condition", status: hasUnusedEvidence ? "pass" : "unknown", detail: hasUnusedEvidence ? "Explicit, uncontradicted customer claim" : "Unused condition missing, uncertain or contradictory" },
    { label: "Refund request", status: wantsReturn ? "pass" : "unknown", detail: wantsReturn ? "Explicit, affirmative refund/return intent" : "No sufficiently supported return/refund request" },
    { label: "Legal / damage exceptions", status: hasException ? "unknown" : noExceptionEstablished ? "pass" : "unknown", detail: hasException ? "Reported issue or rights concern: human review" : noExceptionEstablished ? "No issue reported by the customer" : "Exception status uncertain" },
    { label: "Prompt-injection screening", status: injectionFlag === true ? "fail" : injectionFlag === null ? "unknown" : "pass", detail: injectionFlag === true ? "Suspicious instructions: escalate" : injectionFlag === null ? "Guard result uncertain or unavailable" : mode === "demo" ? "Demo heuristic only" : "Clocked Guard score below safe threshold" },
  ];
  const reasons: string[] = [];
  if (hasException) reasons.push("Reported defect, delivery mismatch or legal rights concern requires human review.");
  if (!noExceptionEstablished) reasons.push("The exception check must confidently rule out reported issues.");
  if (!guardClear) reasons.push("Input safety screening requires human review.");
  if (!hasOrder || !hasProduct) reasons.push("An order and product must both be identified.");
  if (days === null || days < 0) reasons.push("A reliable, explicit delivery date is required.");
  if (!hasUnusedEvidence) reasons.push("The customer has not clearly established unused condition.");
  if (!wantsReturn) reasons.push("An affirmative return or refund request is required.");
  const complete = hasOrder && hasProduct && days !== null && days >= 0
    && hasUnusedEvidence && wantsReturn && noExceptionEstablished && guardClear;
  let lane: TriageResult["lane"] = "review";
  if (complete && days! > WINDOW_DAYS) {
    lane = "reject";
    reasons.push("Customer-reported delivery was " + days + " days ago, outside the illustrative " + WINDOW_DAYS + "-day policy.");
  } else if (complete) {
    lane = "approve";
    reasons.push("All source-grounded claims satisfy the illustrative return policy; no refund was executed.");
  } else if (days !== null && days > WINDOW_DAYS) {
    reasons.push("Reported delivery exceeds " + WINDOW_DAYS + " days, but other evidence or exceptions still require review.");
  }
  if (reasons.length === 0) reasons.push("A human should resolve remaining uncertainty.");
  return {
    mode, lane, redactedText, evidence, assessments, checks, reasons, asOf,
    elapsedDays: days, requestId,
    privacyNotice: mode === "live"
      ? "Best-effort Clocked PII masking and local pattern redaction. Data still reaches Clocked; never submit real customer data without authorization."
      : "Basic local demo masking is not safe for real customer data.",
    policyNotice: "Illustrative 30-day policy based only on customer claims, not verified orders or legal entitlements. No refund, payment or message is executed.",
  };
}
