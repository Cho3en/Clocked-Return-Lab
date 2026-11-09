/**
 * Synthetic reference products used for reproducible, zero-cost hackathon tests.
 *
 * This is NOT a merchant product database or proof that any customer bought
 * anything. In the absence of trusted catalog integration, unrecognized
 * customer-written product names must abstain from Approve AND Decline.
 *
 * Keep this finite and explicit: do not infer trusted products from a name's
 * grammar, an AI Extract confidence score, or a plausible attribute word.
 */
const KNOWN_FIXTURE_NAMES = [
  // Three visible application demo fixtures.
  "Atlas Desk Lamp",
  "Nimbus Headphones",
  "Cedar Wall Clock",
  // Previously documented synthetic HTTP red-team baseline products.
  "Brass Floor Lamp",
  "Lunar Desk Lamp",
  // Explicit, synthetic regression fixtures.
  "Aurora Desk Lamp",
  "Aurora Table Lamp",
  "Aurora Lamp",
  "Widget",
  "Copper Pendant",
  "Aurora Desk Lamp Model 2.0",
  "Aurora Desk Lamp 2.0",
  "Aurora Desk Lamp \u2728 Pro",
  "Aurora L\u00e1mpara de Escritorio",
  "Aurora L\u00e1mpara \ud83c\udf1f 2.0",
  "Caf\u00e9 Aurora Lamp \u2615",
  "\u017darulja \u00c9lite",
  "Aurora \ud83c\udf1f Lamp",
  "\ud83d\udc00\ud83d\udc01\ud83d\udc02",
  "USB-C \ud83d\udc69\u200d\ud83d\udcbb Kit",
] as const;

// Known benign variations of *known synthetic fixtures*, NOT a word-level
// grammar that could hide arbitrary customer text before a "with" clause.
const APPROVED_BENIGN_VARIANTS = [
  "with a wireless charging dock",
  "with an adjustable desk arm",
  "with a black plastic housing",
  "with USB-C power",
  "with an extra bright LED",
  "with a 2.0 firmware revision",
  "with additional power adapters",
  "with bamboo lamp shade",
  "with a replacement bulb",
  "with an included spare cable",
  "with warm light",
  "with bright warm light",
  "with bright LED",
  "with Adjustable Arm and Warm Light",
  "with extra power cable",
] as const;

function canonical(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

const fixtureNames = new Set<string>(KNOWN_FIXTURE_NAMES.map(canonical));
for (const base of ["Aurora Desk Lamp", "Atlas Desk Lamp", "Aurora Table Lamp", "Aurora Lamp"]) {
  for (const suffix of APPROVED_BENIGN_VARIANTS) {
    fixtureNames.add(canonical(base + " " + suffix));
  }
}

/**
 * Recognizes only a deliberately enumerated synthetic label. A customer may
 * still be lying; this does not validate the order or grant refund rights.
 * Novel real catalog items intentionally require a human/merchant lookup.
 */
export function isRecognizedSyntheticProductName(value: string): boolean {
  return typeof value === "string" && Boolean(value.trim()) && fixtureNames.has(canonical(value));
}
