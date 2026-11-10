import { describe, expect, it, vi } from "vitest";
import { triageDemo } from "../lib/demo";
import { evaluatePolicy } from "../lib/policy";
import { triageWithClocked, type ClockedServices } from "../lib/pipeline";
import { classifyCurrentIntent, detectIssueSignals } from "../lib/case-context";
import type { Assessment, EvidenceField } from "../lib/types";

const date = "2026-11-08";
const base = (delivered = "2026-10-26", product = "Aurora Desk Lamp") =>
  "Order ORD-55221 for the " + product + " was delivered on " + delivered +
  ". It is unused and unopened. I want a refund.";

const previouslyUntested: ReadonlyArray<readonly [label: string, fragment: string, product?: string]> = [
  ["intermittent sharp ringing", "The unit emits a shrill ringing sound intermittently."],
  ["tingling connectors", "The charging contacts give me a tingling sensation."],
  ["acrid smell", "The plastic has an acrid odor when connected."],
  ["split insulation", "The power cable insulation has split open."],
  ["jammed adjustment", "The adjustment slider keeps getting stuck."],
  ["resealed packaging", "The factory seal appears to have been resealed."],
  ["manufacturing mismatch", "The manufacturing batch is different from the listing."],
  ["foreign residue", "The unit arrived covered in an unidentified white powder."],
  ["pending duplicates", "My bank shows two pending transactions for the same item."],
  ["unauthorized buyer", "This purchase happened without my authorization."],
  ["flickering performance", "The unit shuts down intermittently without warning."],
  ["substituted item", "The warehouse mailed an older model than the one I selected."],
  ["pairing freezes", "The device freezes every time I try to pair it."],
  ["misaligned construction", "The adjustable hinges are misaligned."],
  ["staining dye", "The finish transfers colored dye onto my clothes."],
  ["latch failure", "The lid refuses to latch in place."],
  ["tracking mismatch", "Courier tracking confirms delivery, but there is nothing here."],
  ["hissing cell", "The battery hisses whenever I connect the power supply."],
  ["customer chargeback", "My bank has opened a dispute about this transaction."],
  ["foreign recall", "Another country has recalled this model."],
  ["customs documentation", "The customs paperwork describes a different product."],
  ["store credit conflict", "Support offered store credit against my wishes."],
  ["incomplete reimbursement", "I received less money back than was agreed."],
  ["injury from packaging", "The sharp packaging slit the side of my finger."],
  ["alarm activation", "My smoke alarm went off when I powered it on."],
  ["table damage", "The finish left permanent marks on my wooden table."],
  ["missing serial", "There is no visible serial number on the product."],
  ["shipment weight", "The parcel weighs much less than the product should weigh."],
  ["extra delivery fee", "An unexplained express fee appeared on my account."],
  ["gift problem", "The gift recipient says this is the wrong item."],
  ["embedded product complaint", "", "Aurora Lamp made a grinding noise"],
  ["embedded product harm", "", "Aurora Lamp causing nausea"],
];

const optimisticModel: Assessment[] = [
  { id: "refund_requested", label: "Refund", answer: true, probability: .999 },
  { id: "item_explicitly_unused", label: "Unused", answer: true, probability: .999 },
  { id: "damaged_or_defective", label: "Defect", answer: false, probability: .001 },
];

function evidenceFor(text: string, delivery: string, product: string): EvidenceField[] {
  const values = {
    order_id: "ORD-55221", product, delivery_date: delivery,
    condition: "unused and unopened", request: "I want a refund",
  };
  return Object.entries(values).map(([id, value]) => {
    const start = text.indexOf(value);
    if (start < 0) throw new Error("Invalid holdout " + id);
    return { id, label: id, value, start, end: start + value.length, confidence: .999 };
  });
}
function forgedClocked(message: string, delivered: string, product: string) {
  const calls: string[] = [];
  const pii = vi.fn(async () => { calls.push("protect"); return { data: { anonymized_text: message } }; });
  const injection = vi.fn(async () => { calls.push("guard"); return { data: { injection: .001, threshold: .5 } }; });
  const extract = vi.fn(async ({ text }: { text: string }) => {
    calls.push("extract");
    const fields: Record<string, unknown> = {};
    for (const item of evidenceFor(text, delivered, product)) {
      fields[item.id] = {
        value: item.value,
        start: [...text.slice(0, item.start)].length,
        end: [...text.slice(0, item.end)].length,
        p_verify: .999,
      };
    }
    return { data: { fields } };
  });
  const decide = vi.fn(async () => {
    calls.push("decide");
    return { data: { answers: {
      refund_requested: { type: "noul", noul: .999 },
      item_explicitly_unused: { type: "noul", noul: .999 },
      damaged_or_defective: { type: "noul", noul: .001 },
    } } };
  });
  return { services: { pii, injection, extract, decide } as unknown as ClockedServices, calls };
}

describe("Independent held-out refund red-team corpus", () => {
  it.each(previouslyUntested)("%s -> Review (deterministic)", (_label, fragment, product) => {
    const text = base("2026-10-26", product ?? "Aurora Desk Lamp") + (fragment ? " " + fragment : "");
    const result = triageDemo(text, date);
    expect(result.lane).toBe("review");
  });
  it.each(previouslyUntested)("%s -> Review (mocked live policy with false-negative Decide)", (_label, fragment, product) => {
    const title = product ?? "Aurora Desk Lamp";
    const text = base("2026-10-26", title) + (fragment ? " " + fragment : "");
    const result = evaluatePolicy({
      mode: "live", redactedText: text,
      evidence: evidenceFor(text, "2026-10-26", title),
      assessments: optimisticModel, asOf: date, requestId: "HOLDOUT", injectionFlag: false,
    });
    expect(result.lane).toBe("review");
  });
  it.each([
    ["ringing", "The unit emits a shrill ringing sound intermittently."],
    ["two pending charges", "My bank shows two pending transactions for the same item."],
    ["shipment stain", "The finish transfers colored dye onto my clothes."],
    ["missing serial", "There is no visible serial number on the product."],
    ["failing latch", "The lid refuses to latch in place."],
    ["other product", "The warehouse mailed an older model than the one I selected."],
  ])("%s -> Review through Protect, Guard, Extract, Decide pipeline", async (_label, fragment) => {
    const text = base() + " " + fragment;
    const client = forgedClocked(text, "2026-10-26", "Aurora Desk Lamp");
    const result = await triageWithClocked(client.services, text, date);
    expect(client.calls).toEqual(["protect", "guard", "extract", "decide"]);
    expect(result.mode).toBe("live");
    expect(result.lane).toBe("review");
  });

  it.each([
    ["clear recent", base(), "approve"],
    ["clear old", base("2026-08-22"), "reject"],
    ["accented product", base("2026-10-26", "Žarulja Élite"), "approve"],
    ["emoji product", base("2026-10-26", "Aurora 🌟 Lamp"), "approve"],
    ["emoji-only product", base("2026-10-26", "🐀🐁🐂"), "approve"],
    ["technical product", base("2026-10-26", "USB-C 👩‍💻 Kit"), "approve"],
  ])("%s still reaches meaningful deterministic outcome", (_label, text, expected) => {
    const result = triageDemo(text, date);
    expect(result.lane).toBe(expected);
    if (expected === "approve" || expected === "reject") {
      const product = result.evidence.find(e => e.id === "product");
      expect(product).toBeDefined();
      expect(result.redactedText.slice(product!.start, product!.end)).toBe(product!.value);
    }
  });
  it.each([
    ["return-only", "I want to return it, but I don't want a refund.", "return-only"],
    ["return-only written", "I want to return the product without asking for a refund.", "return-only"],
    ["withdrawn", "I wanted a refund earlier, but I changed my mind.", "withdrawn"],
    ["current refund", "I want to return it for a refund.", "refund"],
  ])("%s intent stays properly classified", (_label, text, expected) => {
    expect(classifyCurrentIntent(text)).toBe(expected);
  });
  it.each([
    ["battery was swollen", "The battery was swollen."],
    ["battery is swelling", "The battery is swelling."],
    ["battery appears bulging", "The battery appears bulging."],
    ["electric shocks plural", "Several electric shocks were reported."],
  ])("%s is a named safety concern", (_label, text) => {
    expect(detectIssueSignals(text)).toContain("unsafe product");
  });
  it.each([
    ["battery isn't swollen", "The battery isn't swollen."],
    ["battery is not swollen", "The battery is not swollen."],
    ["battery was not bulging", "The battery was not bulging."],
  ])("%s is not falsely reported as a positive named hazard", (_label, text) => {
    expect(detectIssueSignals(text)).not.toContain("unsafe product");
  });
});


describe("Product-name boundary: independent regression cases", () => {
  const riskyProducts = [
    "Aurora Lamp shorting out",
    "Aurora Lamp with exposed wires",
    "Aurora Lamp intermittently shorts",
    "Aurora Lamp stopped functioning",
    "Aurora Lamp with a burning odor",
    "Aurora Lamp sparks at the socket",
  ] as const;
  it.each(riskyProducts)("never approves complaint embedded in product phrase: %s", (product) => {
    const text = base("2026-10-26", product);
    const demo = triageDemo(text, date);
    expect(demo.lane).toBe("review");
    const modeled = evaluatePolicy({
      mode: "live", redactedText: text,
      evidence: evidenceFor(text, "2026-10-26", product),
      assessments: optimisticModel, asOf: date,
      requestId: "PRODUCT-BOUNDARY", injectionFlag: false,
    });
    expect(modeled.lane).toBe("review");
  });
  it("retains explicit safe Unicode product eligibility", () => {
    const text = base("2026-10-26", "Aurora Lámpara 🌟 2.0");
    expect(triageDemo(text, date).lane).toBe("approve");
  });
});
