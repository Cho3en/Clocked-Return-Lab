import { describe, expect, it } from "vitest";
import { triageDemo } from "../lib/demo";
import { evaluatePolicy } from "../lib/policy";
import { triageWithClocked } from "../lib/pipeline";
import type { Assessment, EvidenceField } from "../lib/types";

const AS_OF = "2026-11-09";
const ORDER = "Order ORD-90017";
const HAZARD_PHRASES = [
  "that nearly electrocuted me",
  "whose battery has expanded",
  "that zapped my hand",
  "that poisoned my dog",
  "whose wiring is coming apart",
  "that turns off unexpectedly",
  "that has frayed insulation",
  "that is hazardous",
  "whose battery expanded overnight",
];
const UNKNOWN_HAZARDS = [
  "that gave me a jolt yesterday",
  "that delivered a painful shock",
  "whose cable is coming apart",
  "that electrocuted me",
  "electrocuted me",
  "that burns my hand",
  "that will not stay on",
];

function orderSentence(clause: string, delivered = "2026-11-01") {
  return `${ORDER} for the Aurora Desk Lamp ${clause} was delivered on ${delivered}. It is unused and unopened. I want a refund.`;
}
function productField(clause: string, delivered = "2026-11-01") {
  return `${ORDER}\nProduct: Aurora Desk Lamp ${clause}\nDelivered: ${delivered}\nIt is unused and unopened.\nI want a refund.`;
}
function expectProductAmbiguousReview(message: string) {
  const result = triageDemo(message, AS_OF);
  expect(result.lane).toBe("review");
  const signals = result.caseScope?.issueSignals ?? [];
  const ambiguous = signals.includes("ambiguous product description")
    || (result.caseScope?.unclassifiedStatements ?? 0) > 0;
  expect(ambiguous).toBe(true);
  expect(result.reasons.some((r) => /ambiguous product|Unclassified|issue|safety/i.test(r))).toBe(true);
  // Other gates must independently pass, proving the review is caused by
  // the product/safety ambiguity and not by a missing order/date/request.
  expect(result.checks.find((c) => c.label === "Order reference")?.status).toBe("pass");
  expect(result.checks.find((c) => c.label === "Unused condition")?.status).toBe("pass");
  expect(result.checks.find((c) => c.label === "Refund request")?.status).toBe("pass");
  const product = result.evidence.find((e) => e.id === "product");
  if (product) expect(result.redactedText.slice(product.start, product.end)).toBe(product.value);
  return result;
}

describe("P0 regression: hazard phrases embedded in the product (demo)", () => {
  for (const phrase of HAZARD_PHRASES) {
    it(`order sentence: ${phrase}`, () => expectProductAmbiguousReview(orderSentence(phrase)));
    it(`Product field: ${phrase}`, () => expectProductAmbiguousReview(productField(phrase)));
  }
  for (const phrase of UNKNOWN_HAZARDS) {
    it(`unknown hazard, no lexicon entry: ${phrase}`, () => expectProductAmbiguousReview(orderSentence(phrase)));
  }
  it("expired hazardous request is Review, never Decline", () => {
    const result = triageDemo(orderSentence("that is hazardous", "2026-09-01"), AS_OF);
    expect(result.lane).toBe("review");
    expect(result.elapsedDays).toBeGreaterThan(30);
  });
  it("boundary-day hazardous request is Review, never Approve", () => {
    const result = triageDemo(orderSentence("that is hazardous", "2026-10-10"), AS_OF);
    expect(result.lane).toBe("review");
    expect(result.elapsedDays).toBe(30);
  });
});

describe("benign controls: legitimate returns still get useful routes", () => {
  it("clean eligible approves with exact evidence offsets", () => {
    const result = triageDemo(orderSentence(""), AS_OF);
    expect(result.lane).toBe("approve");
    expect(result.caseScope?.unclassifiedStatements).toBe(0);
    for (const entry of result.evidence) {
      expect(result.redactedText.slice(entry.start, entry.end)).toBe(entry.value);
    }
    expect(result.evidence.find((e) => e.id === "product")?.value).toBe("Aurora Desk Lamp");
  });
  it("clean expired rejects", () => {
    const result = triageDemo(orderSentence("", "2026-09-01"), AS_OF);
    expect(result.lane).toBe("reject");
    expect(result.elapsedDays).toBeGreaterThan(30);
  });
  it.each([
    ["29 days approves", "2026-10-11", "approve"],
    ["30 days approves", "2026-10-10", "approve"],
    ["31 days rejects", "2026-10-09", "reject"],
  ] as const)("boundary: %s", (_label, delivered, lane) => {
    expect(triageDemo(orderSentence("", delivered), AS_OF).lane).toBe(lane);
  });
  it.each([
    "Order ORD-90017 for the Aurora Desk Lamp Model 2.0 was delivered on 2026-11-01. It is unused and unopened. I want a refund.",
    "Order ORD-90017 for the Café Aurora Lamp ☕ was delivered on 2026-11-01. It is unused and unopened. I want a refund.",
    "Order ORD-90017 for the Aurora Lámpara de Escritorio was delivered on 2026-11-01. It is unused and unopened. I want a refund.",
    "Order ORD-90017 for the Aurora Desk Lamp ✨ Pro was delivered on 2026-11-01. It is unused and unopened. I want a refund.",
    "Order ORD-90017 for the Aurora Desk Lamp with Adjustable Arm and Warm Light was delivered on 2026-11-01. It is unused and unopened. I want a refund.",
    "Order ORD-90017\nProduct: Aurora Desk Lamp Model 2.0\nDelivered: 2026-11-01\nIt is unused and unopened.\nI want a refund.",
  ])("benign product name approves: %s", (message) => {
    const result = triageDemo(message, AS_OF);
    expect(result.lane).toBe("approve");
    const product = result.evidence.find((e) => e.id === "product");
    expect(product).toBeDefined();
    expect(result.redactedText.slice(product!.start, product!.end)).toBe(product!.value);
  });
  it("decimal model version is not truncated", () => {
    const result = triageDemo(orderSentence("Model 2.0"), AS_OF);
    expect(result.evidence.find((e) => e.id === "product")?.value).toBe("Aurora Desk Lamp Model 2.0");
  });
  it("negated defect statement (not damaged) still approves", () => {
    const result = triageDemo(`${orderSentence("")} It is not damaged.`, AS_OF);
    expect(result.lane).toBe("approve");
  });
  it("quoted hazard remains Review (fail-closed, documented tradeoff)", () => {
    const result = triageDemo(`${orderSentence("")} My friend said \"it nearly electrocuted me\" but I have not seen that.`, AS_OF);
    expect(result.lane).toBe("review");
  });
});

// --- Mocked live policy: no paid Clocked calls; synthetic provider stubs only. ---

const LIVE_TEXT = orderSentence("that nearly electrocuted me");
function liveClient(opts: { product: string; damaged: number; issue?: string; confidence?: number; misalign?: boolean }) {
  const values: Record<string, string> = {
    order_id: "ORD-90017", product: opts.product, delivery_date: "2026-11-01",
    condition: "unused and unopened", request: "I want a refund",
  };
  if (opts.issue !== undefined) values.issue = opts.issue;
  const fields: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(values)) {
    const utf16 = LIVE_TEXT.indexOf(value);
    const start = [...LIVE_TEXT.slice(0, utf16)].length;
    fields[id] = opts.misalign
      ? { value, start: start + 1, end: start + [...value].length + 1, p_verify: 0.99 }
      : { value, start, end: start + [...value].length, p_verify: opts.confidence ?? 0.99 };
  }
  return {
    pii: async () => ({ data: { anonymized_text: LIVE_TEXT } }),
    injection: async () => ({ data: { injection: 0.01, threshold: 0.5 } }),
    extract: async () => ({ data: { fields } }),
    decide: async () => ({ data: { answers: {
      refund_requested: { type: "noul", noul: 0.99 },
      item_explicitly_unused: { type: "noul", noul: 0.99 },
      damaged_or_defective: { type: "noul", noul: opts.damaged },
    } } }),
  };
}

describe("P0 regression: mocked live policy cannot be overridden by a confident wrong Decide", () => {
  it("absorbed product + damaged=false -> Review", async () => {
    const result = await triageWithClocked(liveClient({ product: "Aurora Desk Lamp that nearly electrocuted me", damaged: 0.01 }) as never, LIVE_TEXT, AS_OF);
    expect(result.lane).toBe("review");
  });
  it("clean product + nonempty extracted issue + damaged=false -> Review", async () => {
    const result = await triageWithClocked(liveClient({ product: "Aurora Desk Lamp", damaged: 0.01, issue: "that nearly electrocuted me" }) as never, LIVE_TEXT, AS_OF);
    expect(result.lane).toBe("review");
    expect(result.reasons.some((r) => /issue/i.test(r))).toBe(true);
  });
  it("clean product + damaged=false + no issue -> Approve (control)", async () => {
    const clean = "Order ORD-90017 for the Aurora Desk Lamp was delivered on 2026-11-01. It is unused and unopened. I want a refund.";
    // Reuse the harness shape against a clean text by evaluating policy directly.
    const evidence: EvidenceField[] = [];
    const add = (id: string, value: string) => {
      const start = clean.indexOf(value);
      evidence.push({ id, label: id, value, start, end: start + value.length, confidence: 0.99 });
    };
    add("order_id", "ORD-90017"); add("product", "Aurora Desk Lamp"); add("delivery_date", "2026-11-01");
    add("condition", "unused and unopened"); add("request", "I want a refund");
    const assessments: Assessment[] = [
      { id: "refund_requested", label: "r", answer: true, probability: 0.99 },
      { id: "item_explicitly_unused", label: "u", answer: true, probability: 0.99 },
      { id: "damaged_or_defective", label: "d", answer: false, probability: 0.01 },
    ];
    const result = evaluatePolicy({ mode: "live", redactedText: clean, evidence, assessments, asOf: AS_OF, requestId: "TEST-1", injectionFlag: false });
    expect(result.lane).toBe("approve");
  });
  it("misaligned extraction spans -> Review", async () => {
    const result = await triageWithClocked(liveClient({ product: "Aurora Desk Lamp", damaged: 0.01, misalign: true }) as never, LIVE_TEXT, AS_OF);
    expect(result.lane).toBe("review");
  });
  it("low-confidence extraction -> Review", async () => {
    const result = await triageWithClocked(liveClient({ product: "Aurora Desk Lamp", damaged: 0.01, confidence: 0.5 }) as never, LIVE_TEXT, AS_OF);
    expect(result.lane).toBe("review");
  });
  it("ambiguous Decide probabilities -> Review", async () => {
    const result = await triageWithClocked(liveClient({ product: "Aurora Desk Lamp", damaged: 0.5 }) as never, LIVE_TEXT, AS_OF);
    expect(result.lane).toBe("review");
  });
});


// Independent post-remediation holdout: product attributes must not mask hazards.
const POST_REMEDIATION_ADVERSE = [
  "with an intermittent electrical jolt",
  "with a nasty electric jolt",
  "with unexpected power cuts",
  "with sudden power cutouts",
  "with an alarming spark-like noise",
  "with intermittent power surges",
  "with a rupturing power cell",
  "with a visibly deformed power cell",
  "with unstable voltage",
  "with intermittent battery failures",
  "with a searingly hot charger",
  "with bubbling battery cells",
  "with a charger giving off fumes",
  "with scorched insulation",
  "with damaged insulation",
  "with torn insulation",
  "with flaky insulation",
  "with cracked insulation",
  "with a battery bulging against the housing",
  "with an unusually hot connector",
  "with an acrid chemical odor",
  "with a toxic odor",
  "with a melted electrical connector",
  "after giving my hand a painful jolt",
  "after emitting an acrid cloud",
  "causing fingers to tingle",
  "causing chest discomfort",
  "with wiring falling apart",
  "due to an electric jolt",
  "due to a severed charging cable",
  "with loose electrical contacts",
  "that almost shocked the owner",
  "having electrocuted the previous owner",
  "with smoke seeping from the housing",
  "with a hazardous defect",
  "with a flickering power supply",
  "which left a scorch mark",
  "with a hot-to-touch charging cable",
  "with an electrical discharge",
  "with a short circuit"
] as const;
const POST_REMEDIATION_BENIGN = [
  "with a wireless charging dock",
  "with an adjustable desk arm",
  "with a black plastic housing",
  "with USB-C power",
  "with an extra bright LED",
  "with a 2.0 firmware revision",
  "with additional power adapters",
  "with bamboo lamp shade",
  "with a replacement bulb",
  "with an included spare cable"
] as const;
describe("P0 follow-up: restrictive product attribute parsing", () => {
  const make = (suffix: string, field: boolean) => field
    ? "Order ORD-90017\nProduct: Aurora Desk Lamp " + suffix + "\nDelivered: 2026-11-01\nIt is unused and unopened.\nI want a refund."
    : "Order ORD-90017 for the Aurora Desk Lamp " + suffix + " was delivered on 2026-11-01. It is unused and unopened. I want a refund.";
  for (const suffix of POST_REMEDIATION_ADVERSE) {
    for (const field of [false, true]) {
      it("must review unfamiliar incident qualifier: " + suffix + " (" + (field ? "field" : "sentence") + ")", () => {
        const result = triageDemo(make(suffix, field), AS_OF);
        expect(result.lane).toBe("review");
        expect((result.caseScope?.issueSignals.length ?? 0) + (result.caseScope?.unclassifiedStatements ?? 0)).toBeGreaterThan(0);
        expect(result.checks.find((check) => check.label === "Order reference")?.status).toBe("pass");
        expect(result.checks.find((check) => check.label === "Unused condition")?.status).toBe("pass");
        expect(result.checks.find((check) => check.label === "Refund request")?.status).toBe("pass");
      });
    }
  }
  for (const suffix of POST_REMEDIATION_BENIGN) {
    for (const field of [false, true]) {
      it("retains clean catalog attribute: " + suffix + " (" + (field ? "field" : "sentence") + ")", () => {
        const result = triageDemo(make(suffix, field), AS_OF);
        expect(result.lane).toBe("approve");
        expect(result.caseScope?.unclassifiedStatements).toBe(0);
      });
    }
  }
});
