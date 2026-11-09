import { describe, expect, it } from "vitest";
import { triageDemo } from "../lib/demo";
import { evaluatePolicy } from "../lib/policy";
import { triageWithClocked, type ClockedServices } from "../lib/pipeline";
import { isProductAmbiguous } from "../lib/statement-coverage";
import { isRecognizedSyntheticProductName } from "../lib/synthetic-product-catalog";
import type { Assessment, EvidenceField } from "../lib/types";

const AS_OF = "2026-11-09";
type Format = "sentence" | "field";
const FORMATS: readonly Format[] = ["sentence", "field"];

function message(product: string, date = "2026-11-01", format: Format = "sentence") {
  if (format === "field") {
    return "Order ORD-90017\nProduct: " + product
      + "\nDelivered: " + date + "\nIt is unused and unopened.\nI want a refund.";
  }
  return "Order ORD-90017 for the " + product + " was delivered on "
    + date + ". It is unused and unopened. I want a refund.";
}
function evidenceFor(text: string, product: string, date: string): EvidenceField[] {
  const values = {
    order_id: "ORD-90017", product, delivery_date: date,
    condition: "unused and unopened", request: "I want a refund",
  };
  return Object.entries(values).map(([id, value]) => {
    const start = text.indexOf(value);
    if (start < 0) throw Error("Missing exact test evidence: " + id);
    return { id, label: id, value, start, end: start + value.length, confidence: 0.999 };
  });
}
const OPTIMISTIC_DECIDE: Assessment[] = [
  { id: "refund_requested", label: "Refund", answer: true, probability: 0.999 },
  { id: "item_explicitly_unused", label: "Unused", answer: true, probability: 0.999 },
  { id: "damaged_or_defective", label: "Defect", answer: false, probability: 0.001 },
];
function optimisticLive(product: string, date = "2026-11-01", format: Format = "sentence",
  extractedProduct = product) {
  const text = message(product, date, format);
  return evaluatePolicy({
    mode: "live", redactedText: text, evidence: evidenceFor(text, extractedProduct, date),
    assessments: OPTIMISTIC_DECIDE, asOf: AS_OF, requestId: "SYNTHETIC-CATALOG-TEST",
    injectionFlag: false,
  });
}
function assertIdentityReview(result: ReturnType<typeof triageDemo>) {
  expect(result.lane).toBe("review");
  expect(result.checks.find(c => c.label === "Order reference")?.status).toBe("pass");
  expect(result.checks.find(c => c.label === "Unused condition")?.status).toBe("pass");
  expect(result.checks.find(c => c.label === "Refund request")?.status).toBe("pass");
  expect(result.caseScope?.issueSignals.includes("ambiguous product description")
    || (result.caseScope?.unclassifiedStatements ?? 0) > 0).toBe(true);
}

// Matrix A  -  38 novel adversarial descriptions, in both supported formats.
// These are customer allegations, not verified catalog product titles.
const FRESH_38 = [
  "toxic", "flammable", "acidic", "corrosive", "radioactive", "explosive",
  "dangerous", "unsafe", "poisonous", "volatile", "irritant", "lethal",
  "caustic", "fire risk", "shock risk", "injury risk", "thermal hazard",
  "toxic fumes", "electrical hazard", "short circuit risk",
  "chemical exposure", "battery rupture", "sharp fragments",
  "toxic with warm light", "flammable with warm light",
  "radioactive with extra bright LED", "corrosive with bamboo lamp shade",
  "explosive with a wireless charging dock",
  "injury risk with bright LED", "battery rupture with bright LED",
  "sizzles with warm light", "hisses with bright LED",
  "jolts with wireless charging dock", "battery is toxic",
  "battery chemically unstable", "battery too hot",
  "melting connector with bright LED",
  "injures users with bamboo lamp shade",
] as const;

// Matrix B  -  the 15 independent hazards, both in-window and expired,
// with both supported product formats. Previously 30 Approves/30 Declines.
const EXPIRED_15 = [
  "toxic", "flammable", "radioactive", "acidic", "corrosive",
  "explosive", "caustic", "chemical exposure", "battery rupture",
  "fire risk", "toxic with warm light", "radioactive with extra bright LED",
  "battery rupture with bright LED", "sizzles with warm light",
  "battery chemically unstable",
] as const;

describe("P0 structural trust-boundary matrix A: 76 unknown products", () => {
  for (const suffix of FRESH_38) for (const format of FORMATS) {
    it("requires Review for unverified fixture: " + suffix + " / " + format, () => {
      const result = triageDemo(message("Aurora Desk Lamp " + suffix, "2026-11-01", format), AS_OF);
      assertIdentityReview(result);
    });
  }
});

describe("P0 structural trust-boundary matrix B: 60 hazard/expiry combinations", () => {
  for (const suffix of EXPIRED_15) for (const date of ["2026-11-01", "2026-09-01"])
    for (const format of FORMATS) {
      it("never Approves or Declines an unverified name: " + suffix + " / " + date + " / " + format, () => {
        const result = triageDemo(message("Aurora Desk Lamp " + suffix, date, format), AS_OF);
        assertIdentityReview(result);
        expect(result.elapsedDays).toBe(date === "2026-09-01" ? 69 : 8);
      });
    }
});

describe("P0 synthetic registry  -  do not mistake known labels for a merchant order lookup", () => {
  const BENIGN = [
    "Atlas Desk Lamp", "Nimbus Headphones", "Cedar Wall Clock",
    "Aurora Desk Lamp", "Aurora Table Lamp", "Aurora Lamp", "Widget",
    "Copper Pendant", "Aurora Desk Lamp Model 2.0",
    "Aurora Desk Lamp with warm light", "Aurora Desk Lamp with bright LED",
    "Aurora Desk Lamp with an adjustable desk arm",
    "Aurora Desk Lamp with a wireless charging dock",
    "Aurora Desk Lamp with a black plastic housing",
    "Aurora Desk Lamp with a replacement bulb",
    "Aurora Desk Lamp \u2728 Pro", "Caf\u00e9 Aurora Lamp \u2615",
    "Aurora L\u00e1mpara de Escritorio", "\u017darulja \u00c9lite",
    "Aurora \ud83c\udf1f Lamp", "\ud83d\udc00\ud83d\udc01\ud83d\udc02",
    "USB-C \ud83d\udc69\u200d\ud83d\udcbb Kit",
  ] as const;
  for (const product of BENIGN) {
    it("preserves an explicitly approved synthetic name + exact offsets: " + product, () => {
      expect(isRecognizedSyntheticProductName(product)).toBe(true);
      expect(isProductAmbiguous(product)).toBe(false);
      const result = triageDemo(message(product), AS_OF);
      expect(result.lane).toBe("approve");
      for (const item of result.evidence) {
        expect(result.redactedText.slice(item.start, item.end)).toBe(item.value);
      }
    });
  }
  for (const product of [
    "Aurora Desk Lamp toxic with warm light",
    "Aurora Desk Lamp sizzles with warm light",
    "Aurora Desk Lamp with warm cable",
    "Aurora Blue Lamp", "Unknown Desk Lamp",
    "Aurora Desk Lamp Model 3.0", "Aurora Desk Lamp \u2728 Toxic Pro",
    "Aurora Desk Lamp Model 2.0 flammable",
    "Aurora Desk Lamp with warm light toxic",
  ]) {
    it("fails closed for unregistered product identity: " + product, () => {
      expect(isRecognizedSyntheticProductName(product)).toBe(false);
      expect(isProductAmbiguous(product)).toBe(true);
      assertIdentityReview(triageDemo(message(product), AS_OF));
    });
  }
  it("normalizes safe case and whitespace variants without adding unknown words", () => {
    expect(isRecognizedSyntheticProductName("  AURORA  DESK LAMP  ")).toBe(true);
    expect(isRecognizedSyntheticProductName("Aurora Desk Lamp toxic  ")).toBe(false);
  });
});

describe("P0 shared policy: incorrect high-confidence Clocked judgments cannot bypass identity", () => {
  for (const suffix of [
    "toxic", "battery rupture", "sizzles with warm light",
    "flammable with warm light", "unknown benign decal",
  ]) for (const format of FORMATS) for (const date of ["2026-11-01", "2026-09-01"]) {
    it("abstains despite confident false-negative Decide: " + suffix + " / " + format + " / " + date, () => {
      const result = optimisticLive("Aurora Desk Lamp " + suffix, date, format);
      assertIdentityReview(result);
      expect(result.checks.find(c => c.label === "Product identification")?.status).toBe("unknown");
    });
  }
  for (const format of FORMATS) {
    it("raw customer allegation cannot be hidden by Extract trimming product: " + format, () => {
      const result = optimisticLive("Aurora Desk Lamp toxic with warm light",
        "2026-11-01", format, "Aurora Desk Lamp");
      expect(result.lane).toBe("review");
      expect(result.caseScope?.unclassifiedStatements).toBeGreaterThan(0);
      expect(result.checks.find(c => c.label === "Order reference")?.status).toBe("pass");
    });
    it("retains simulated known-label live-path control: " + format, () => {
      const result = optimisticLive("Aurora Desk Lamp", "2026-11-01", format);
      expect(result.lane).toBe("approve");
      expect(result.checks.find(c => c.label === "Product identification")?.status).toBe("pass");
    });
    it("known-label synthetic expired case is provisionally Decline: " + format, () => {
      expect(optimisticLive("Aurora Desk Lamp", "2026-09-01", format).lane).toBe("reject");
    });
  }
});


function mockedClockedPipeline(text: string, extractedProduct: string, date: string) {
  const calls: string[] = [];
  const fields: Record<string, object> = {};
  for (const item of evidenceFor(text, extractedProduct, date)) {
    fields[item.id] = {
      value: item.value,
      start: [...text.slice(0, item.start)].length,
      end: [...text.slice(0, item.end)].length,
      p_verify: 0.999,
    };
  }
  const services = {
    pii: async () => {
      calls.push("Protect");
      return { data: { anonymized_text: text } };
    },
    injection: async () => {
      calls.push("Guard");
      return { data: { injection: 0.001, threshold: 0.5 } };
    },
    extract: async () => {
      calls.push("Extract");
      return { data: { fields } };
    },
    decide: async () => {
      calls.push("Decide");
      return { data: { answers: {
        refund_requested: { type: "noul", noul: 0.999 },
        item_explicitly_unused: { type: "noul", noul: 0.999 },
        damaged_or_defective: { type: "noul", noul: 0.001 },
      } } };
    },
  };
  return { services: services as unknown as ClockedServices, calls };
}

describe("P0 complete mocked SDK pipeline  -  no paid Clocked requests", () => {
  for (const suffix of [
    "toxic", "flammable", "battery rupture",
    "radioactive with extra bright LED", "sizzles with warm light",
    "caustic", "chemical exposure", "fire risk",
  ]) for (const format of FORMATS) for (const date of ["2026-11-01", "2026-09-01"]) {
    it("mocked provider cannot approve or decline an unknown name: " + suffix + " / " + format + " / " + date,
      async () => {
        const text = message("Aurora Desk Lamp " + suffix, date, format);
        const mocked = mockedClockedPipeline(text, "Aurora Desk Lamp " + suffix, date);
        const result = await triageWithClocked(mocked.services, text, AS_OF);
        expect(result.lane).toBe("review");
        expect(result.mode).toBe("live");
        expect(mocked.calls).toEqual(["Protect", "Guard", "Extract", "Decide"]);
        expect(result.checks.find(c => c.label === "Product identification")?.status).toBe("unknown");
      });
  }
  for (const product of [
    "Atlas Desk Lamp", "Aurora Desk Lamp",
    "Aurora Desk Lamp Model 2.0", "Caf\u00e9 Aurora Lamp \u2615",
  ]) for (const format of FORMATS) {
    it("mocked provider retains an explicit synthetic known name: " + product + " / " + format,
      async () => {
        const text = message(product, "2026-11-01", format);
        const mocked = mockedClockedPipeline(text, product, "2026-11-01");
        const result = await triageWithClocked(mocked.services, text, AS_OF);
        expect(result.lane).toBe("approve");
        expect(mocked.calls).toEqual(["Protect", "Guard", "Extract", "Decide"]);
        for (const field of result.evidence) {
          expect(result.redactedText.slice(field.start, field.end)).toBe(field.value);
        }
      });
  }
  for (const format of FORMATS) {
    it("mocked Extract cannot hide a raw hazard behind a trimmed known name: " + format, async () => {
      const text = message("Aurora Desk Lamp toxic with warm light", "2026-11-01", format);
      const mocked = mockedClockedPipeline(text, "Aurora Desk Lamp", "2026-11-01");
      const result = await triageWithClocked(mocked.services, text, AS_OF);
      expect(result.lane).toBe("review");
      expect(result.caseScope?.unclassifiedStatements).toBeGreaterThan(0);
    });
  }
});


describe("P0 raw Product: field must survive punctuation and warning-symbol boundaries", () => {
  const suffixes = [
    " ?", " ??", " !!!", " !?", " .",
    " \u26a0\ufe0f", " \ud83d\udca5", " \u2049\ufe0f", " \u2026",
  ];
  for (const suffix of suffixes) for (const format of FORMATS)
    for (const date of ["2026-11-01", "2026-09-01"]) {
      it("preserves unknown suffix before coverage classification: "
        + JSON.stringify(suffix) + " / " + format + " / " + date, () => {
        const result = triageDemo(message("Aurora Desk Lamp" + suffix, date, format), AS_OF);
        expect(result.lane).toBe("review");
        expect(result.checks.find(c => c.label === "Order reference")?.status).toBe("pass");
        expect(result.caseScope?.unclassifiedStatements).toBeGreaterThan(0);
      });
    }
});
