import { evaluatePolicy } from "./policy";
import { FIELD_LABELS, QUESTION_LABELS } from "./evidence";
import type { Assessment, EvidenceField, TriageResult } from "./types";

function maskForDemo(text: string) {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b(?:\+?\d[\s()-]?){9,15}\b/g, "[PHONE]");
}
function find(text: string, id: string, expression: RegExp): EvidenceField | null {
  const m = expression.exec(text);
  if (!m) return null;
  const value = m[1] ?? m[0];
  const start = m.index + m[0].indexOf(value);
  return { id, label: FIELD_LABELS[id], value, start, end: start + value.length, confidence: null };
}
export function triageDemo(message: string, asOf: string): TriageResult {
  const text = maskForDemo(message);
  const candidates = [
    find(text, "order_id", /\b(ORD-\d{4,12})\b/i),
    find(text, "product", /\b(?:for the|for a|for my)\s+([A-Za-z][A-Za-z ]{3,45}?)(?=\s+(?:was delivered|stopped working|is damaged|arrived|on \d{4}-)|[.,])/i),
    find(text, "delivery_date", /\b(?:delivered on|received on)\s+(\d{4}-\d{2}-\d{2})/i),
    find(text, "condition", /\b((?:unused|unopened|factory sealed|still sealed)[^.!\n]{0,90})/i),
    find(text, "request", /\b((?:I would like|I want|Can I get|Could I get)[^.!\n]{0,100}(?:refund|return)[^.!\n]{0,40})/i),
    find(text, "issue", /\b((?:stopped working|broken|damaged|defective|faulty)[^.!\n]{0,70})/i),
  ];
  const evidence = candidates.filter((v): v is EvidenceField => v !== null);
  const flags: Record<string, boolean> = {
    refund_requested: /\b(refund|return|money back)\b/i.test(text),
    item_explicitly_unused: /\b(unused|unopened|factory sealed)\b/i.test(text),
    damaged_or_defective: /\b(broken|damaged|defective|faulty|stopped working|malfunction)\b/i.test(text),
  };
  const assessments: Assessment[] = Object.entries(QUESTION_LABELS).map(([id, label]) => ({
    id, label, answer: flags[id], probability: null,
  }));
  const injectionFlag = /ignore (?:all |the )?(?:previous |prior )?instructions|system prompt/i.test(text);
  return evaluatePolicy({ mode: "demo", redactedText: text, evidence, assessments, asOf, requestId: "DEMO-" + crypto.randomUUID().slice(0, 8).toUpperCase(), injectionFlag });
}
