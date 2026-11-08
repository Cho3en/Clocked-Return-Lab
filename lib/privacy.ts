// Defense in depth after Clocked PII. This is pattern-based, not guaranteed anonymization.
function luhnCheck(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}
export function scrubRemainingIdentifiers(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){10,30}\b/gi, "[BANK_ACCOUNT]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[IDENTIFIER]")
    .replace(/(?<![A-Z0-9])(?:\d[ -]?){13,19}(?![A-Z0-9])/gi, (candidate) => {
      const digits = candidate.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits)
        ? "[CARD]" : candidate;
    })
    .replace(/(?<!\w)\+\d{1,3}[\s-]?(?:\d[\s()-]?){8,13}\b/g, "[PHONE]");
}
