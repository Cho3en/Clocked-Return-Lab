import { classifyCurrentIntent, hasIssue, inspectCaseScope } from "./case-context";
import { isProductAmbiguous } from "./statement-coverage";
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
  return first === null || second === null ? null : Math.round((second - first) / 86_400_000);
}
export function isUnusedClaim(text: string): boolean {
  const explicitlyNotUnused = /\b(?:not|never|isn't|wasn't)\s+(?:unused|unopened|sealed|new)\b/i.test(text);
  const withoutNegatedUse = text.replace(
    /\b(?:not|never|haven't|hasn't|hadn't|didn't|isn't|wasn't|not\s+yet)\s+(?:been\s+)?(?:used|opened|worn|tried\s+on|tested|installed)\b/gi,
    " ",
  );
  const contradicts = /\b(?:used|opened|worn|tried\s+on|tested|installed)\b/i.test(withoutNegatedUse);
  const positive = /\b(?:unused|unopened|factory\s+sealed|still\s+sealed|never\s+used|not\s+used|haven't\s+used|hasn't\s+been\s+used)\b/i.test(text);
  return positive && !explicitlyNotUnused && !contradicts;
}
export function isAffirmativeReturnRequest(text: string): boolean {
  // For this refund workflow, a return-only request is not authorization for a refund.
  return classifyCurrentIntent(text) === "refund";
}
export function hasRightsOrIssue(text: string): boolean { return hasIssue(text); }

export function evaluatePolicy(input: {
  mode: Mode;
  redactedText: string;
  evidence: EvidenceField[];
  assessments: Assessment[];
  asOf: string;
  requestId: string;
  injectionFlag?: boolean | null;
}): TriageResult {
  const { mode, redactedText, evidence, assessments, asOf, requestId, injectionFlag = null } = input;
  const scope = inspectCaseScope(redactedText, evidence);
  const field = (id: string) => evidence.find((item) => item.id === id);
  const trusted = (id: string) => {
    const item = field(id);
    if (!item || !item.value || item.start < 0 || item.end > redactedText.length
      || redactedText.slice(item.start, item.end) !== item.value) return undefined;
    if (mode === "live" && (item.confidence === null || item.confidence < MIN_LIVE_EXTRACT_CONFIDENCE)) return undefined;
    return item.value;
  };
  const assessment = (id: string) => assessments.find((a) => a.id === id)?.answer ?? null;

  const order = trusted("order_id");
  const product = trusted("product");
  const condition = trusted("condition");
  const request = trusted("request");
  const statedDate = trusted("delivery_date");
  const days = elapsedDays(statedDate, asOf);
  const hasOrder = Boolean(order && /^(?:#[0-9]{3,18}|[A-Z0-9][A-Z0-9-]{4,35})$/i.test(order)
    && scope.orderRefs.length === 1 && scope.orderRefs[0].toUpperCase() === order.toUpperCase());
  const hasProduct = Boolean(product && product.trim().length >= 3);
  const identityClear = scope.identityBlockers.length === 0 && hasOrder;
  const hasUnusedEvidence = Boolean(condition)
    && isUnusedClaim(condition!) && isUnusedClaim(redactedText)
    && assessment("item_explicitly_unused") === true;
  const wantsRefund = Boolean(request) && scope.intent === "refund"
    && isAffirmativeReturnRequest(request!) && assessment("refund_requested") === true;
  // Extracted issue evidence is an independent exception signal. A model
  // Decide verdict of "no defect" cannot erase a source-aligned issue
  // phrase; only an explicitly negated issue phrase is not a concern.
  const issueValue = trusted("issue");
  const issueField = field("issue");
  const issueContext = issueField ? redactedText.slice(Math.max(0, issueField.start - 24), issueField.start) : "";
  const negatedIssue = Boolean(issueValue && (/\b(?:not|never|isn't|wasn't|is not|was not)\s+(?:damaged|broken|defective|faulty|hazardous|electrocuted|swollen|expanded|smoking|sparking|leaking)\b/i.test(issueValue)
    || /\b(?:not|never|isn't|wasn't|is not|was not|no)\s*$/i.test(issueContext)));
  const hasExtractedIssue = Boolean(issueValue && !negatedIssue);
  const productAmbiguous = Boolean(product && isProductAmbiguous(product));
  const hasException = hasRightsOrIssue(redactedText) || assessment("damaged_or_defective") === true
    || hasExtractedIssue || productAmbiguous || scope.issueSignals.length > 0;
  const noExceptionEstablished = !hasException && assessment("damaged_or_defective") === false;
  const guardClear = injectionFlag === false;

  const checks: PolicyCheck[] = [
    { label: "Message context coverage", status: scope.unclassifiedStatements === 0 ? "pass" : "unknown",
      detail: scope.unclassifiedStatements === 0 ? "All statements fit recognized request/context patterns; claims are still unverified" :
        scope.unclassifiedStatements + " statement(s) require human classification before any recommendation" },
    { label: "Case identity and linkage", status: identityClear ? "pass" : "unknown",
      detail: identityClear ? "One linked customer-reported order: " + scope.linkedOrderId : scope.identityBlockers.join(" ") || "Order needs verification" },
    { label: "Order reference", status: hasOrder ? "pass" : "unknown",
      detail: hasOrder ? order + " (customer-reported; not independently verified)" : "Order identification or attribution is uncertain" },
    { label: "Product identification", status: productAmbiguous ? "unknown" : hasProduct ? "pass" : "unknown",
      detail: productAmbiguous ? "Product description contains a clause or customer event that must be separated from product identity by a human" : hasProduct ? product + " (customer-reported)" : "Product needs confirmation" },
    { label: "Delivery date", status: days === null ? "unknown" : days < 0 ? "fail" : "pass",
      detail: days === null ? "No adequately grounded delivery date" : days < 0 ? "Delivery date is in the future" : statedDate + " (customer-reported)" },
    { label: "30-day return window", status: days === null || days < 0 ? "unknown" : days <= WINDOW_DAYS ? "pass" : "fail",
      detail: days === null ? "Cannot calculate" : days < 0 ? "Date inconsistency" : days + " days since claimed delivery; illustrative cutoff " + WINDOW_DAYS },
    { label: "Unused condition", status: hasUnusedEvidence ? "pass" : "unknown",
      detail: hasUnusedEvidence ? "Explicit, uncontradicted customer claim" : "Unused condition is missing, ambiguous, or contradictory" },
    { label: "Refund request", status: wantsRefund ? "pass" : "unknown",
      detail: wantsRefund ? "Current, explicit refund request" : "Current intent: " + scope.intent + "; an affirmative refund request has not been established" },
    { label: "Legal / damage exceptions", status: hasException ? "unknown" : noExceptionEstablished && scope.unclassifiedStatements === 0 ? "pass" : "unknown",
      detail: hasException ? "Issue/safety concern: " + (scope.issueSignals.join(", ") || "model flagged concern") + ". Human review required."
        : noExceptionEstablished ? "No issue reported in this message" : "Exception status not confidently ruled out" },
    { label: "Prompt-injection screening", status: injectionFlag === true ? "fail" : injectionFlag === null ? "unknown" : "pass",
      detail: injectionFlag === true ? "Suspicious instructions: escalate" : injectionFlag === null ? "Guard unavailable or uncertain"
        : mode === "demo" ? "Demo heuristic only" : "Clocked Guard below safe threshold" },
  ];
  const reasons = [...scope.blockers];
  if (!guardClear) reasons.push("Input safety screening requires human review.");
  if (!hasProduct) reasons.push("A product must be identified before recommending an outcome.");
  if (days === null || days < 0) reasons.push("A single, valid and adequately grounded delivery date is required.");
  if (!hasUnusedEvidence) reasons.push("The customer has not clearly established unused condition.");
  if (!wantsRefund && scope.intent === "refund") reasons.push("Current refund authorization is not sufficiently supported by extracted evidence and model assessment.");
  if (!noExceptionEstablished && !hasException) reasons.push("The exception check cannot confidently rule out reported issues.");
  if (productAmbiguous) reasons.push("Product description is ambiguous: a clause or customer event is embedded in the product field and must be separated by a human.");
  if (hasExtractedIssue) reasons.push("Extracted issue evidence reports a concern even though the model assessment reported no defect.");

  // Both positive and negative recommendations require the SAME complete case.
  // All ambiguity is resolved by abstaining, not by choosing the first plausible match.
  const complete = scope.coherent && identityClear && hasProduct && days !== null && days >= 0
    && hasUnusedEvidence && wantsRefund && noExceptionEstablished && guardClear;
  let lane: TriageResult["lane"] = "review";
  if (complete && days! > WINDOW_DAYS) {
    lane = "reject";
    reasons.push("The sole customer-reported delivery is " + days + " days old, outside the illustrative " + WINDOW_DAYS + "-day policy.");
  } else if (complete) {
    lane = "approve";
    reasons.push("The single coherent, customer-reported case passes the illustrative policy; no refund has been executed.");
  } else if (days !== null && days > WINDOW_DAYS) {
    reasons.push("The reported date is beyond " + WINDOW_DAYS + " days, but scope, intent or legal exceptions still require review.");
  }
  if (reasons.length === 0) reasons.push("Human verification is required for any unresolved uncertainty.");
  return {
    mode, lane, redactedText, evidence, assessments, checks, reasons, asOf, elapsedDays: days, requestId,
    caseScope: scope,
    privacyNotice: mode === "live"
      ? "Best-effort Clocked masking and local pattern redaction; data reaches Clocked. Only use authorized synthetic or customer data."
      : "Basic local demo masking is not privacy-safe for real customer data.",
    policyNotice: "Customer-reported evidence only; no order-system verification or legal determination. All outcomes are advisory. No refunds, payments or messages are executed.",
  };
}
