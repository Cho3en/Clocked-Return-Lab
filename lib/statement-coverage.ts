import { isRecognizedSyntheticProductName } from "./synthetic-product-catalog";

/**
 * Conservative supplementary safeguard: if a sentence is neither a recognized
 * order/condition/request statement nor trivial metadata, human review wins.
 *
 * Exact source spans and model probabilities do not prove that an unknown
 * sentence is harmless. This grammar is deliberately restrictive and English-
 * oriented, not an independent merchant verification or general NLP parser.
 */
const SAFE: RegExp[] = [
  /^subject:\s*(?:(?:return|refund)\s+(?:request|for)\s+(?:for\s+)?order\s+|order\s+)?(?:ORD-[A-Z0-9-]{4,35}|#\d{3,18})$/i,
  /^(?:(?:hi|hello),?\s+)?(?:my\s+)?order\s+(?:ORD-[A-Z0-9-]{4,35}|#\d{3,18})(?:\s+for\s+(?:the|a|my)\s+[\p{L}\p{N}\p{M}\p{P}\p{S}\p{Zs}\p{Cf}]{3,100})?\s+was\s+(?:(?:purchased|ordered)\s+on\s+\d{4}-\d{2}-\d{2}\s+and\s+)?delivered\s+on\s+\d{4}-\d{2}-\d{2}$/iu,
  /^(?:my\s+)?order\s+(?:ORD-[A-Z0-9-]{4,35}|#\d{3,18})\s+for\s+(?:the|a|my)\s+[\p{L}\p{N}\p{M}\p{P}\p{S}\p{Zs}\p{Cf}]{3,100}\s+(?:arrived|was\s+received)\s+on\s+\d{4}-\d{2}-\d{2}$/iu,
  /^(?:my\s+)?delivery\s+date\s+(?:was|is)\s+\d{4}-\d{2}-\d{2}$/i,
  /^(?:my\s+)?order\s+delivery\s+was\s+on\s+\d{4}-\d{2}-\d{2}$/i,
  /^(?:order|order\s+reference|order\s+id|order\s+number):?\s*(?:ORD-[A-Z0-9-]{4,35}|#\d{3,18})$/i,
  /^product:\s*[\p{L}\p{N}\p{M}\p{P}\p{S}\p{Zs}\p{Cf}]{3,100}$/iu,
  /^delivered:\s*\d{4}-\d{2}-\d{2}$/i,
  /^delivery\s*date:\s*\d{4}-\d{2}-\d{2}$/i,
  /^(?:it|this(?:\s+item)?|the\s+(?:item|product))\s+is\s+(?:unused|unopened)(?:\s+and\s+(?:unused|unopened))?(?:\s+(?:in|with)\s+(?:its\s+|the\s+)?original\s+packaging)?(?:\s+and\s+(?:not\s+damaged|not\s+used|never\s+used|i\s+never\s+used\s+it))?$/i,
  /^(?:it|this(?:\s+item)?|the\s+(?:item|product|[A-Za-z]+))\s+is\s+not\s+(?:damaged|faulty|defective|broken|smoking)(?:\s+and\s+not\s+(?:damaged|faulty|defective|broken|smoking))?$/i,
  /^i\s+changed\s+my\s+mind\s+earlier,\s+but\s+now\s+i\s+(?:definitely\s+)?want\s+(?:a\s+)?refund$/i,
  /^(?:i\s+have\s+not|i\s+haven't|i\s+never)\s+used\s+it$/i,
  /^condition:\s*(?:unused|unopened)(?:\s+and\s+(?:unused|unopened))?$/i,
  /^(?:i|we)\s+(?:want|need|request|would\s+like)\s+(?:a\s+)?refund(?:\s+for\s+(?:order\s+)?(?:ORD-[A-Z0-9-]{4,35}|#\d{3,18}))?$/i,
  /^(?:i|we)\s+(?:would\s+like\s+to|want\s+to|need\s+to)\s+(?:get|receive|request|obtain)\s+(?:a\s+)?refund$/i,
  /^(?:i|we)\s+(?:would\s+like\s+to|want\s+to|need\s+to)\s+(?:return|send\s+(?:it\s+)?back)\s+(?:it\s+)?for\s+(?:a\s+)?refund(?:\s+for\s+(?:order\s+)?(?:ORD-[A-Z0-9-]{4,35}|#\d{3,18}))?$/i,
  /^(?:can|could|may)\s+(?:i|we)\s+(?:please\s+)?(?:get|have|request)\s+(?:a\s+)?refund$/i,
  /^please\s+(?:issue|process|provide|send|give\s+me)\s+(?:a\s+)?refund$/i,
  /^please\s+(?:refund|reimburse)\s+me$/i,
  /^please\s+refund$/i,
  /^request:\s*please\s+(?:refund|reimburse)\s+me$/i,
  /^(?:hi|hello|dear\s+support|good\s+morning|good\s+afternoon)$/i,
  /^(?:[Hh]i|[Hh]ello),\s*(?:[Ii]\s+am|[Ii]'m)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}(?:\s*\(\s*\[EMAIL\]\s*\))?$/,
  /^(?:[Ii]\s+am|[Ii]'m)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}(?:\s*\(\s*\[EMAIL\]\s*\))?$/,
  /^(?:thank\s+you|thanks|best\s+regards|kind\s+regards|regards)$/i,
  /^(?:my\s+email\s+is|email:|please\s+contact)\s*\[EMAIL\]$/i,
];

// The ENTIRE customer-written product span must match a recognized synthetic
// fixture name. Unknown identity is NOT evidence that no hazard exists.
// In particular, a harmless-looking 'with' suffix must never hide a
// complaint phrase that precedes it.
export function isProductAmbiguous(product: string): boolean {
  return Boolean(product.trim()) && !isRecognizedSyntheticProductName(product);
}
function hasEmbeddedComplaint(statement: string): boolean {
  const product = statement.match(/\bfor\s+(?:the|a|my)\s+(.+?)\s+(?:was\s+(?:delivered|purchased|received)|arrived)\b/i)?.[1]
    ?? statement.match(/^product:\s*(.+)$/i)?.[1];
  return Boolean(product && isProductAmbiguous(product));
}

export interface CoverageAssessment {
  unknownCount: number;
  totalStatements: number;
}
export function checkSafeStatementCoverage(text: string): CoverageAssessment {
  const statements = text.replace(/\r/g, "").replace(/(\d)\.(?=\d)/g, "$1\uE000").split(/[.!?\n]+/)
    .map(part=>part.replace(/\uE000/g, "."))
    .map(part=>part.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]+\s*/u,"").replace(/\s+/g," ").trim())
    .filter(Boolean);
  let unknownCount=0;
  for(const statement of statements) if(hasEmbeddedComplaint(statement) || !SAFE.some(pattern=>pattern.test(statement))) unknownCount++;
  return {unknownCount,totalStatements:statements.length};
}
