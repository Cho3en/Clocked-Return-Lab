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

// A free-form product name must not swallow a complaint clause. The generic
// product-name grammar is permissive to support Unicode names, but any
// relative clause, first-person event, or behavior/harm predicate inside
// that span is ambiguous — regardless of whether its exact wording appears
// in a finite hazard lexicon. The structural clause check below is the
// primary defence; the predicate list is supplementary, not sufficient.
const relativeClause = /\b(?:that|whose|which|who|whom)\b/i;
const eventMarker = /\b(?:nearly|unexpectedly|overnight|yesterday|gave\s+(?:me|us)|deliver(?:s|ed)?\s+(?:a|an|the)\s+(?:painful\s+)?(?:shock|jolt|zap)|(?:me|us)\s+(?:a\s+)?(?:shock|jolt|zap))\b/i;
const embeddedPredicate = /\b(?:made|makes|caus(?:e|es|ed|ing)|produc(?:e|es|ed|ing)|emitt?(?:ed|ing|s)?|grind(?:s|ing)?|squeal(?:s|ing)?|hurt(?:s|ing)?|smell(?:s|ing)?|vibrat(?:e|es|ing)|fail(?:s|ed|ing)?|malfunction(?:s|ed|ing)?|burn(?:s|ed|ing)?|trigger(?:s|ed|ing)?|short(?:ing|ed|s)?(?:\s+out)?|exposed\s+(?:wires?|copper|cables?|conductors?)|stopp?ed\s+(?:functioning|working)|non[-\s]?functional|sparks?|sparking|arcing|overheat(?:ing|ed)?|(?:burning|acrid)\s+odou?r|leak(?:ing|s)?|shocks?|electrocut\w*|zap(?:ped|s|ping)?|poison\w*|hazard\w*|expand\w*|fray\w*|(?:coming|falling|taken|breaking)\s+apart|turns?\s+(?:off|itself)|turning\s+off|unexpected\w*)\b/i;
/**
 * An arbitrary customer description is not a verified catalogue product name.
 * Only a restricted, explicitly non-event accessory vocabulary may appear after
 * "with" in a name eligible for automatic advisory routing. Everything else
 * escalates, rather than attempting to enumerate all possible harm vocabulary.
 * This is deliberately conservative until a merchant catalogue verifies names.
 */
const safeAttributeTokens = new Set([
  "a", "an", "and", "the", "with", "usb-c", "led", "2.0",
  "wireless", "charging", "dock", "adjustable", "desk", "arm",
  "black", "white", "blue", "green", "red", "grey", "gray",
  "plastic", "metal", "wooden", "bamboo", "housing", "extra", "bright", "warm",
  "firmware", "revision", "additional", "power", "adapters",
  "lamp", "shade", "replacement", "bulb", "included", "spare",
  "cable", "light", "case", "cover", "stand", "holder", "matte",
  "glossy", "silver", "gold", "small", "large", "medium", "pro",
]);
const uncertainProductContext = /\b(?:after|before|during|while|when|having|following|because|due\s+to|causing|resulting|despite|until|upon|since|from|without|containing|featuring|showing|giving|emitting)\b/i;
function isSafeAccessoryPhrase(value: string): boolean {
  const words = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 10
    && words.every((word) => /^\d+(?:\.\d+)?$/.test(word) || safeAttributeTokens.has(word));
}
/** True when product text cannot be trusted as a simple harmless name. */
export function isProductAmbiguous(product: string): boolean {
  const value = product.trim();
  if (!value) return false;
  if (relativeClause.test(value) || eventMarker.test(value) || embeddedPredicate.test(value)
    || /\b(?:me|us)\b/i.test(value) || uncertainProductContext.test(value)) return true;
  const withParts = value.split(/\bwith\b/i);
  return withParts.length > 2 || (withParts.length === 2 && !isSafeAccessoryPhrase(withParts[1]));
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
