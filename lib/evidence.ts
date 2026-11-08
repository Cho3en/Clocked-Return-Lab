import type { Assessment, EvidenceField } from "./types";

export const FIELD_LABELS: Record<string, string> = {
  order_id: "Order reference",
  product: "Product",
  delivery_date: "Delivery date",
  condition: "Item condition",
  request: "Customer request",
  issue: "Reported issue",
};
export const QUESTIONS = {
  refund_requested: {
    type: "noul" as const,
    instructions: "Does the sender currently and affirmatively ask for a monetary refund for the item, rather than an exchange, a return without refund, a hypothetical question or an old/quoted/withdrawn request? If unclear, answer NO.",
    criteria: { true: "Current, explicit refund request from the sender.", false: "Return-only, exchange-only, question, historical quotation, withdrawn or ambiguous request." },
  },
  item_explicitly_unused: {
    type: "noul" as const,
    instructions: "Does the customer clearly claim the item has not been used and is unopened/unused? Negations like 'not unused' mean NO. Conflicting claims mean NO.",
    criteria: { true: "An explicit, uncontradicted claim the item is unused or unopened.", false: "No explicit claim, or used/opened, negated or contradictory condition." },
  },
  damaged_or_defective: {
    type: "noul" as const,
    instructions: "Does any part of this email report a product safety concern (smoke, heat, fire, shock, leaking), wrong color/size/variant, defect, damage, missing goods, incorrect product or statutory consumer-rights claim? Negated claims alone are NO. If any genuine concern is reported, answer YES.",
    criteria: { true: "A safety, product, delivery, description, or statutory-rights problem is reported.", false: "No problem is reported." },
  },
};
export const QUESTION_LABELS: Record<string, string> = {
  refund_requested: "Explicit return/refund intent",
  item_explicitly_unused: "Explicit unused condition",
  damaged_or_defective: "Damage / exception concern",
};

export function codePointOffsetToUtf16(text: string, offset: number): number | null {
  if (!Number.isInteger(offset) || offset < 0) return null;
  let codePoints = 0;
  let utf16 = 0;
  for (const char of text) {
    if (codePoints === offset) return utf16;
    utf16 += char.length;
    codePoints += 1;
  }
  return codePoints === offset ? utf16 : null;
}
export function exactSpan(text: string, value: unknown, start: unknown, end: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (typeof start !== "number" || typeof end !== "number" || !Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end > text.length || end <= start) return null;
  if (text.slice(start, end) !== value) return null;
  return { start, end };
}
export function normalizeFields(
  text: string,
  raw: unknown,
  offsetUnit: "utf16" | "codepoint" = "utf16",
): EvidenceField[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const fields = raw as Record<string, unknown>;
  return Object.entries(FIELD_LABELS).flatMap(([id, label]) => {
    const obj = fields[id];
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const candidate = obj as Record<string, unknown>;
    const start = offsetUnit === "codepoint" && typeof candidate.start === "number"
      ? codePointOffsetToUtf16(text, candidate.start) : candidate.start;
    const end = offsetUnit === "codepoint" && typeof candidate.end === "number"
      ? codePointOffsetToUtf16(text, candidate.end) : candidate.end;
    const span = exactSpan(text, candidate.value, start, end);
    if (!span) return [];
    // p_verify means probability that this exact extracted value was read correctly.
    const probability = candidate.p_verify ?? candidate.confidence;
    const confidence = typeof probability === "number" && Number.isFinite(probability)
      && probability >= 0 && probability <= 1 ? probability : null;
    return [{ id, label, value: candidate.value as string, ...span, confidence }];
  });
}
function probabilityOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
export function classifyInjectionRisk(response: unknown): boolean | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;
  const obj = response as Record<string, unknown>;
  const score = probabilityOrNull(obj.injection);
  const threshold = probabilityOrNull(obj.threshold);
  if (score === null || threshold === null) return null;
  if (score >= threshold) return true;
  // Near-cutoff classifications are not safe enough to assume absence of injection.
  return score <= threshold - 0.1 ? false : null;
}
export function normalizeAssessments(raw: unknown): Assessment[] {
  const map = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown> : {};
  return Object.entries(QUESTION_LABELS).map(([id, label]) => {
    const entry = map[id];
    const obj = entry && typeof entry === "object" && !Array.isArray(entry)
      ? entry as Record<string, unknown> : {};
    const p = probabilityOrNull(obj.noul);
    // A 0.5 binary cutoff is too permissive for consequential eligibility.
    // Ambiguous probabilities or absent values become Unknown, never a confident yes/no.
    const answer = p === null ? null : p >= 0.8 ? true : p <= 0.2 ? false : null;
    return { id, label, answer, probability: p };
  });
}
