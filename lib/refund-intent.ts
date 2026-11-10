/**
 * One phrase table for current refund requests.
 *
 * Intent classification (lib/case-context.ts), demo field extraction
 * (lib/demo.ts) and statement coverage (lib/statement-coverage.ts) all read
 * from this module. Before this existed the three layers each carried their
 * own regex, so ordinary phrasing such as "I'd like a refund" was recognized
 * by one layer and not the others.
 *
 * Recognizing a phrase here never authorizes an outcome. Every refund still
 * needs grounded order, product, date, unused-condition and exception checks.
 */

const APOS = "['\u2019]";
const SUBJECT = "(?:i|we)";
const REFUND = "(?:a\\s+)?(?:refund|reimbursement)";
const ORDER_SUFFIX = "(?:\\s+for\\s+(?:order\\s+)?(?:ORD-[A-Z0-9-]{4,35}|#\\d{3,18}))?";

const QUALIFIER = "(?:(?:definitely|really|still|now|also|finally|just|actually|only)\\s+)?";
const WOULD_LIKE = `(?:${SUBJECT}\\s+${QUALIFIER}would\\s+like|${SUBJECT}${APOS}d\\s+like)`;
const WANT = `${SUBJECT}\\s+${QUALIFIER}(?:want|need|request|demand|wish\\s+for|(?:am|are)\\s+(?:requesting|asking\\s+for))`;
const INTEND = `${SUBJECT}\\s+${QUALIFIER}(?:want|need|wish|intend)`;
const ASK = "(?:can|could|would|will|may)";

/** Clause boundaries: a request must start a sentence or clause, not sit inside a question. */
const CLAUSE_START = "(?:^|[.!?;:,\\n]\\s*|(?:and|then|so|but)\\s+)";

const BODIES: string[] = [
  // "I would like a refund", "I'd like a refund", "We would like a refund"
  `${WOULD_LIKE}\\s+${REFUND}${ORDER_SUFFIX}`,
  // "I want a refund", "I need a refund", "I request a refund", "I am requesting a refund"
  `${WANT}\\s+${REFUND}${ORDER_SUFFIX}`,
  // "I would like to get a refund", "I would like to receive a refund"
  `${WOULD_LIKE}\\s+to\\s+(?:get|receive|request|obtain|have)\\s+${REFUND}${ORDER_SUFFIX}`,
  `${INTEND}\\s+to\\s+(?:get|receive|request|obtain|have)\\s+${REFUND}${ORDER_SUFFIX}`,
  // "Please give me a refund", "Please send me a refund", "Please issue a refund"
  `please\\s+(?:give\\s+me|send\\s+me|issue(?:\\s+me)?|process(?:\\s+me)?|provide(?:\\s+me)?|pay\\s+me)\\s+${REFUND}${ORDER_SUFFIX}`,
  "please\\s+refund\\s+me",
  "please\\s+reimburse\\s+me",
  "please\\s+refund",
  // "Refund please"
  "refund\\s+please",
  // "Can you refund me", "Could you please refund me"
  `${ASK}\\s+(?:you|i|we)\\s+(?:please\\s+)?refund\\s+me`,
  // "Can I get a refund", "Could I have a refund"
  `${ASK}\\s+(?:i|we)\\s+(?:please\\s+)?(?:get|have|request|receive)\\s+${REFUND}${ORDER_SUFFIX}`,
  // "I want my money back"
  `(?:${WOULD_LIKE}|${SUBJECT}\\s+(?:want|need))\\s+my\\s+money\\s+back`,
  // "I want to send it back for a refund", "I would like to return it for a refund"
  `(?:${WOULD_LIKE}|${INTEND})\\s+to\\s+(?:return(?:\\s+(?:it|this|the\\s+(?:item|product)))?|send\\s+(?:it|this|the\\s+(?:item|product))?\\s*back)\\s+(?:for|and\\s+(?:get|receive))\\s+${REFUND}${ORDER_SUFFIX}`,
];

const STATEMENT_PATTERNS = BODIES.map((body) => new RegExp("^" + body + "$", "i"));
const CLAUSE_PATTERNS = BODIES.map((body) => new RegExp(CLAUSE_START + "(?:" + body + ")", "i"));
// Evidence display may start mid-sentence ("... but now I definitely want a
// refund"). Approval still requires hasCurrentRefundRequest below.
const SPAN_PATTERNS = BODIES.map((body) => new RegExp("\\b(?:" + body + ")", "i"));

/** True when the whole statement is a recognized current refund request. */
export function isRefundRequestStatement(statement: string): boolean {
  return STATEMENT_PATTERNS.some((pattern) => pattern.test(statement));
}

/** True when the message contains a current refund request as its own clause. */
export function hasCurrentRefundRequest(text: string): boolean {
  return CLAUSE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Exact source span of the earliest current refund request in the message.
 * Used by demo-mode extraction so evidence offsets point at real characters.
 */
export function findRefundRequestSpan(text: string): { value: string; start: number; end: number } | null {
  let best: { value: string; start: number; end: number } | null = null;
  for (const pattern of SPAN_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const value = match[0].trim();
    const start = match.index + match[0].indexOf(value);
    if (!best || start < best.start || (start === best.start && value.length > best.value.length)) {
      best = { value, start, end: start + value.length };
    }
  }
  return best;
}

/** Anchored statement patterns for the conservative statement-coverage grammar. */
export function refundStatementPatterns(): RegExp[] {
  return STATEMENT_PATTERNS.slice();
}
