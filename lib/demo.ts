import { evaluatePolicy, hasRightsOrIssue, isAffirmativeReturnRequest, isUnusedClaim } from "./policy";
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
  const value = m.slice(1).find((group) => group !== undefined) ?? m[0];
  const start = m.index + m[0].indexOf(value);
  return { id, label: FIELD_LABELS[id], value, start, end: start + value.length, confidence: null };
}
export function triageDemo(message: string, asOf: string): TriageResult {
  const text = maskForDemo(message);
  const candidates = [
    find(text, "order_id", /(?:\b(ORD-[A-Z0-9-]{4,35})\b|(?:^|[^\w])(#\d{3,18})\b)/i),
    find(text, "product", /\b(?:for the|for a|for my)\s+([A-Za-z][A-Za-z ]{3,60}?)(?=\s+(?:was delivered|was purchased|stopped working|is damaged|arrived|on \d{4}-)|[.,])/i)
      ?? find(text, "product", /\bproduct:\s*([A-Za-z][A-Za-z ]{3,60})(?=\n|[.!]|$)/i),
    find(text, "delivery_date", /\b(?:delivered on|received on|delivery date(?: was| is)?|delivered:)\s*(\d{4}-\d{2}-\d{2})/i),
    find(text, "condition", /\b((?:unused|unopened|factory sealed|still sealed)[^.!\n]{0,90})/i),
    find(text, "request", /\b((?:I would like|I want|I need|We want|Can I get|Could I get|Please issue|Please process|Please refund|Please reimburse|I am requesting)[^.!\n]{0,140}(?:refund|return|reimburse(?:ment|d)?)[^.!\n]{0,50})/i)
      ?? find(text, "request", /\b(please\s+(?:reimburse\s+me|refund\s+me|issue\s+a\s+refund)|i\s+definitely\s+want\s+a\s+refund)\b/i),
    find(text, "issue", /\b((?:stopped working|broken|damaged|defective|faulty)[^.!\n]{0,70})/i),
  ];
  const evidence = candidates.filter((v): v is EvidenceField => v !== null);
  const flags: Record<string, boolean> = {
    refund_requested: isAffirmativeReturnRequest(text),
    item_explicitly_unused: isUnusedClaim(text),
    damaged_or_defective: hasRightsOrIssue(text),
  };
  const assessments: Assessment[] = Object.entries(QUESTION_LABELS).map(([id, label]) => ({
    id, label, answer: flags[id], probability: null,
  }));
  const injectionFlag = /ignore (?:all |the )?(?:previous |prior )?instructions|system prompt/i.test(text);
  return evaluatePolicy({ mode: "demo", redactedText: text, evidence, assessments, asOf, requestId: "DEMO-" + crypto.randomUUID().slice(0, 8).toUpperCase(), injectionFlag });
}
