import type { Assessment, EvidenceField, Mode, PolicyCheck, TriageResult } from "./types";

const WINDOW_DAYS = 30;

function parseDay(input: string | undefined): number | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const ms = Date.parse(input + "T12:00:00Z");
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === input ? ms : null;
}
export function elapsedDays(delivery: string | undefined, asOf: string): number | null {
  const first = parseDay(delivery);
  const second = parseDay(asOf);
  if (first === null || second === null) return null;
  return Math.round((second - first) / 86_400_000);
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
  const value = (id: string) => evidence.find((e) => e.id === id)?.value;
  const answer = (id: string) => assessments.find((a) => a.id === id)?.answer;
  const days = elapsedDays(value("delivery_date"), asOf);
  const hasOrder = Boolean(value("order_id") && /^[A-Z0-9][A-Z0-9-]{4,35}$/i.test(value("order_id")!));
  const hasProduct = Boolean(value("product"));
  const textCondition = value("condition") ?? "";
  const unused = /\b(unused|unopened|factory sealed|still sealed)\b/i.test(textCondition);
  const contradictsUnused = /\b(not unused|not unopened|opened|used|worn|tried on)\b/i.test(textCondition.replace(/\bunused\b/gi, "pristine").replace(/\bunopened\b/gi, "sealed"));
  const exceptionText = /\b(broken|damaged|defective|faulty|malfunction|stopped working|does not work|not working|consumer rights|warranty)\b/i.test(redactedText);
  const hasException = exceptionText || answer("damaged_or_defective") === true;
  const wantsReturn = Boolean(value("request")) && /\b(refund|return|money back)\b/i.test(value("request")!) && answer("refund_requested") !== false;
  const hasUnusedEvidence = unused && !contradictsUnused && answer("item_explicitly_unused") !== false;
  const checks: PolicyCheck[] = [
    { label: "Order reference", status: hasOrder ? "pass" : "unknown", detail: hasOrder ? value("order_id")! : "No verified order identifier" },
    { label: "Product identification", status: hasProduct ? "pass" : "unknown", detail: hasProduct ? value("product")! : "Product needs confirmation" },
    { label: "Delivery date", status: days === null ? "unknown" : days < 0 ? "fail" : "pass", detail: days === null ? "No exact verified delivery date" : days < 0 ? "Delivery date is in the future" : value("delivery_date")! },
    { label: "30-day return window", status: days === null || days < 0 ? "unknown" : days <= WINDOW_DAYS ? "pass" : "fail", detail: days === null ? "Cannot calculate" : days < 0 ? "Date inconsistency" : String(days) + " days elapsed, maximum " + WINDOW_DAYS },
    { label: "Unused condition", status: hasUnusedEvidence ? "pass" : "unknown", detail: hasUnusedEvidence ? "Confirmed by a source excerpt" : "Not explicitly verified, or condition conflicts" },
    { label: "Refund request", status: wantsReturn ? "pass" : "unknown", detail: wantsReturn ? "Explicitly requested" : "Intent needs confirmation" },
    { label: "Legal / damage exceptions", status: hasException ? "unknown" : "pass", detail: hasException ? "Reported defect or rights issue: always human review" : "No explicit exception detected" },
    { label: "Prompt-injection screening", status: injectionFlag === true ? "fail" : injectionFlag === null ? "unknown" : "pass", detail: injectionFlag === true ? "Suspicious instructions: escalate" : injectionFlag === null ? "Could not verify" : mode === "demo" ? "Demo heuristic only" : "Clocked Guard returned no injection flag" },
  ];
  const reasons: string[] = [];
  let lane: TriageResult["lane"] = "review";
  if (hasException) reasons.push("A defect, warranty, or statutory-rights issue requires a person; the demo return window is not decisive.");
  if (injectionFlag !== false) reasons.push("Input safety screening needs human confirmation.");
  if (!hasOrder || !hasProduct) reasons.push("Order and product must both be identified before a recommendation.");
  if (days === null || days < 0) reasons.push("The delivery date must be explicitly stated and valid.");
  if (!hasUnusedEvidence) reasons.push("The source does not conclusively establish unused condition.");
  if (!wantsReturn) reasons.push("Refund intent must be explicit and supported by evidence.");
  if (days !== null && days > WINDOW_DAYS) {
    reasons.push("Delivery was " + days + " days ago, outside the example " + WINDOW_DAYS + "-day policy.");
    if (hasOrder && !hasException && injectionFlag === false) lane = "reject";
  } else if (hasOrder && hasProduct && days !== null && days >= 0 && days <= WINDOW_DAYS && hasUnusedEvidence && wantsReturn && !hasException && injectionFlag === false) {
    lane = "approve";
    reasons.push("The request meets every verified condition in the example policy.");
  }
  if (lane === "review" && reasons.length === 0) reasons.push("A human should resolve the remaining uncertainty.");
  return {
    mode, lane, redactedText, evidence, assessments, checks, reasons, asOf,
    elapsedDays: days, requestId,
    privacyNotice: mode === "live" ? "Clocked Protect masked personal data before analysis. Original text is not stored by this app." : "Local demo masking uses basic patterns and is NOT privacy-safe for real customer data.",
    policyNotice: "Demo policy only: unused goods within 30 days after delivery. Real legal rights, exceptions and store rules require verification. No refunds or emails are sent.",
  };
}
