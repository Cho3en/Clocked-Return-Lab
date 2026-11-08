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
    instructions: "Does the sender explicitly ask to return an item or receive a refund? Answer only from the provided text.",
    criteria: {
      true: "A refund or return request is explicitly stated.",
      false: "There is no explicit refund or return request.",
    },
  },
  item_explicitly_unused: {
    type: "noul" as const,
    instructions: "Does the sender explicitly say that the item is unused or unopened? Do not infer condition.",
    criteria: {
      true: "The text explicitly says unused or unopened.",
      false: "The text does not explicitly confirm unused or unopened condition.",
    },
  },
  damaged_or_defective: {
    type: "noul" as const,
    instructions: "Does the sender report a broken, damaged, faulty, defective, or malfunctioning item?",
    criteria: {
      true: "A defect or damage is explicitly reported.",
      false: "No defect or damage is explicitly reported.",
    },
  },
};

export const QUESTION_LABELS: Record<string, string> = {
  refund_requested: "Explicit return/refund intent",
  item_explicitly_unused: "Explicit unused condition",
  damaged_or_defective: "Damage / defect exception",
};

export function exactSpan(text: string, value: unknown, start: unknown, end: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (typeof start !== "number" || typeof end !== "number" || !Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end > text.length || end <= start) return null;
  if (text.slice(start, end) !== value) return null;
  return { start, end };
}

export function normalizeFields(text: string, raw: unknown): EvidenceField[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const fields = raw as Record<string, unknown>;
  return Object.entries(FIELD_LABELS).flatMap(([id, label]) => {
    const obj = fields[id];
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    const candidate = obj as Record<string, unknown>;
    const span = exactSpan(text, candidate.value, candidate.start, candidate.end);
    if (!span) return [];
    const c = candidate.confidence ?? candidate.p_verify;
    return [{ id, label, value: candidate.value as string, ...span, confidence: typeof c === "number" && c >= 0 && c <= 1 ? c : null }];
  });
}

function probabilityOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}
function readProbability(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  // The official Clocked "noul" response is P(yes), not a Boolean.
  return probabilityOrNull(obj.noul ?? obj.probability ?? obj.confidence ?? obj.prob);
}
function readBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.decision === "boolean") return obj.decision;
  if (typeof obj.value === "boolean") return obj.value;
  if (typeof obj.answer === "boolean") return obj.answer;
  const p = readProbability(obj);
  const threshold = probabilityOrNull(obj.threshold) ?? 0.5;
  return p === null ? null : p >= threshold;
}
export function classifyInjectionRisk(response: unknown): boolean | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;
  const obj = response as Record<string, unknown>;
  const score = probabilityOrNull(obj.injection);
  const threshold = probabilityOrNull(obj.threshold);
  return score === null || threshold === null ? null : score >= threshold;
}

export function normalizeAssessments(raw: unknown): Assessment[] {
  const map = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return Object.entries(QUESTION_LABELS).map(([id, label]) => {
    const entry = map[id];
    return { id, label, answer: readBool(entry), probability: readProbability(entry) };
  });
}
