import { describe, expect, it } from "vitest";
import { triageDemo } from "../lib/demo";
import { triageWithClocked } from "../lib/pipeline";
import { isRecognizedSyntheticProductName } from "../lib/synthetic-product-catalog";
const AS_OF = "2026-11-09";
const base = (p: string, d = "2026-11-01") => "Order ORD-90017 for the " + p + " was delivered on " + d + ". It is unused and unopened. I want a refund.";
const field = (p: string, d = "2026-11-01") => "Order ORD-90017\nProduct: " + p + "\nDelivered: " + d + "\nIt is unused and unopened.\nI want a refund.";
describe("Independent Independent held-out regression cases", () => {
  it("identity attacks", () => {
    const cases: Array<[string, string, string]> = [
      ["fixture+unknown", base("Aurora Desk Lamp toxic"), "review"],
      ["unknown+fixture", base("Toxic Aurora Desk Lamp"), "review"],
      ["quoted fixture", base("\"Aurora Desk Lamp\""), "review"],
      ["fixture+punct", field("Aurora Desk Lamp ??"), "review"],
      ["fixture+paren", base("Aurora Desk Lamp (toxic)"), "review"],
      ["fixture+bracket", base("Aurora Desk Lamp [toxic]"), "review"],
      ["multi fixture", field("Aurora Desk Lamp Aurora Table Lamp"), "review"],
      ["fixture+complaint-no-terminator", "Order ORD-90017 for the Aurora Desk Lamp toxic was delivered on 2026-11-01. It is unused and unopened. I want a refund.", "review"],
      ["fixture+extra-sentence", base("Aurora Desk Lamp") + " The lamp is toxic.", "review"],
      ["item label", "Order ORD-90017\nItem: Aurora Desk Lamp toxic\nDelivered: 2026-11-01\nIt is unused and unopened.\nI want a refund.", "review"],
      ["sku label", "Order ORD-90017\nSKU: Aurora Desk Lamp\nDelivered: 2026-11-01\nIt is unused and unopened.\nI want a refund.", "review"],
      ["markdown product", "Order ORD-90017\n**Product:** Aurora Desk Lamp\nDelivered: 2026-11-01\nIt is unused and unopened.\nI want a refund.", "review"],
    ];
    for (const [, msg, lane] of cases) {
      const r = triageDemo(msg, AS_OF);
      expect(r.lane).toBe(lane);
    }
  });
  it("checks Unicode normalization and rejects confusable identities", () => {
    const fixture = "Caf\u00e9 Aurora Lamp \u2615";
    expect(isRecognizedSyntheticProductName(fixture)).toBe(true);
    expect(isRecognizedSyntheticProductName(fixture.normalize("NFD"))).toBe(true);
    expect(isRecognizedSyntheticProductName("Aurora\u200bDesk Lamp")).toBe(false);
    expect(isRecognizedSyntheticProductName("Aurora\u00a0Desk Lamp")).toBe(true);
    expect(isRecognizedSyntheticProductName("\uFF21\uFF55\uFF52\uFF4F\uFF52\uFF41 Desk Lamp")).toBe(false);
    expect(isRecognizedSyntheticProductName(fixture + "\uFE0F")).toBe(false);
    expect(isRecognizedSyntheticProductName("aurora desk lamp")).toBe(true);
    expect(isRecognizedSyntheticProductName("Aurora   Desk   Lamp")).toBe(true);
    expect(isRecognizedSyntheticProductName("Aurora Desk Lamp.")).toBe(false);
    const result = triageDemo(field("Aurora Desk Lamp ??"), AS_OF);
    expect(result.lane).toBe("review");
    expect(result.caseScope?.unclassifiedStatements).toBeGreaterThan(0);
  });
  it("generated matrix 250+", () => {
    const hazards = ["toxic","flammable","radioactive","corrosive","acidic","volatile","lethal","explosion","battery rupture","chemical exposure","fire risk","sizzles","jolts","hisses","melts","arcs","pops","flickers","buzzes","drips","fumes","leaking acid","exposed wiring","burning","smoking","sparking","overheating","swollen battery","expanded battery","frayed insulation","poisoned","electrocuted","hazardous","dangerous","recalled","counterfeit","melted connector","torn insulation","cracked casing","peeling coating","sharp edges","hot charger","unstable voltage","power surges","rupturing cell","deformed cell","bubbling cells","scorched insulation","damaged insulation","loose contacts","severed cable","short circuit","discharge","toxic odor","acrid odor","chemical smell","rash","burns fingers","cut my hand","gave me a jolt","shocked me","zapped me","nearly electrocuted me","turns off unexpectedly","wiring coming apart","battery expanded overnight","battery has expanded","has frayed insulation","is hazardous","poisoned my dog","zapped my hand","intermittent jolt","electrical jolt","power cutouts","hot connector","smoke seeping","flickering supply","scorch mark","torn wiring","exposed copper","melting plastic","bubbling battery","swelling battery","bulging battery","leaking fluid","cracked housing","peeling paint","flaking coating","bent frame","scratched surface","chemical fumes","toxic fumes","acid leak","oil leak","smoke","fire","exploded","burst","ruptured","ignited"];
    const benign = ["Aurora Desk Lamp","Atlas Desk Lamp","Nimbus Headphones","Cedar Wall Clock","Aurora Desk Lamp Model 2.0","Aurora Desk Lamp ✨ Pro","Café Aurora Lamp ☕","Aurora Lámpara de Escritorio","Aurora Desk Lamp with warm light","Aurora Desk Lamp with a wireless charging dock","Aurora Desk Lamp with an adjustable desk arm","Aurora Desk Lamp with a black plastic housing","Aurora Desk Lamp with USB-C power","Aurora Desk Lamp with an extra bright LED","Aurora Desk Lamp with a 2.0 firmware revision","Aurora Desk Lamp with additional power adapters","Aurora Desk Lamp with bamboo lamp shade","Aurora Desk Lamp with a replacement bulb","Aurora Desk Lamp with an included spare cable","Aurora Desk Lamp with bright warm light","Aurora Desk Lamp with bright LED","Aurora Desk Lamp with extra power cable","Widget","Copper Pendant","Brass Floor Lamp","Lunar Desk Lamp","Aurora Table Lamp","Aurora Lamp","Aurora Desk Lamp 2.0","Aurora Lámpara 🌟 2.0","Žarulja Élite","Aurora 🌟 Lamp","🐀🐁🐂","USB-C 👩‍💻 Kit"];
    let unsafeApprove = 0, unsafeDecline = 0, total = 0; const unsafe: string[] = [];
    for (const suffix of hazards) {
      for (const fmt of [0, 1]) {
        for (const d of ["2026-11-01", "2026-09-01"]) {
          total++;
          const msg = fmt ? field("Aurora Desk Lamp " + suffix, d) : base("Aurora Desk Lamp " + suffix, d);
          const lane = triageDemo(msg, AS_OF).lane;
          if (lane === "approve") { unsafeApprove++; unsafe.push(suffix + " fmt" + fmt + " " + d); }
          if (lane === "reject") { unsafeDecline++; unsafe.push("DECLINE " + suffix + " fmt" + fmt + " " + d); }
        }
      }
    }
    let benignApprove = 0, benignReject = 0, benignReview = 0, benignTotal = 0; const benignReviewNames: string[] = [];
    for (const name of benign) {
      for (const fmt of [0, 1]) {
        for (const d of ["2026-11-01", "2026-09-01"]) {
          benignTotal++;
          const msg = fmt ? field(name, d) : base(name, d);
          const lane = triageDemo(msg, AS_OF).lane;
          const expected = d === "2026-11-01" ? "approve" : "reject";
          if (lane === expected) { if (lane === "approve") benignApprove++; else benignReject++; }
          else { benignReview++; benignReviewNames.push(name + " fmt" + fmt + " " + d + " => " + lane); }
        }
      }
    }
    expect(total).toBe(400);
    expect(benignTotal).toBe(136);
    expect(unsafeApprove).toBe(0);
    expect(unsafeDecline).toBe(0);
    expect(benignReview).toBe(0);
    expect(benignApprove + benignReject).toBe(benignTotal);
  });
  it("mocked live: extract prefix only + wrong decide", async () => {
    const text = "Order ORD-90017 for the Aurora Desk Lamp toxic was delivered on 2026-11-01. It is unused and unopened. I want a refund.";
    const mk = (product: string, damaged: number, issue?: string, conf = 0.99) => {
      const vals: Record<string, string> = { order_id: "ORD-90017", product, delivery_date: "2026-11-01", condition: "unused and unopened", request: "I want a refund" };
      if (issue) vals.issue = issue;
      const fields: Record<string, unknown> = {};
      for (const [id, v] of Object.entries(vals)) { const u = text.indexOf(v); const s = [...text.slice(0, u)].length; fields[id] = { value: v, start: s, end: s + [...v].length, p_verify: conf }; }
      return {
        pii: async () => ({ data: { anonymized_text: text } }),
        injection: async () => ({ data: { injection: 0.01, threshold: 0.5 } }),
        extract: async () => ({ data: { fields } }),
        decide: async () => ({ data: { answers: { refund_requested: { type: "noul", noul: 0.99 }, item_explicitly_unused: { type: "noul", noul: 0.99 }, damaged_or_defective: { type: "noul", noul: damaged } } } }),
      };
    };
    const a = await triageWithClocked(mk("Aurora Desk Lamp", 0.01) as never, text, AS_OF);
    const b = await triageWithClocked(mk("Aurora Desk Lamp toxic", 0.01) as never, text, AS_OF);
    const c = await triageWithClocked(mk("Aurora Desk Lamp", 0.01, "toxic") as never, text, AS_OF);
    const d = await triageWithClocked(mk("Aurora Desk Lamp", 0.01, undefined, 0.5) as never, text, AS_OF);
    expect(a.lane).toBe("review"); expect(b.lane).toBe("review"); expect(c.lane).toBe("review"); expect(d.lane).toBe("review");
  });
  it("edge formats", () => {
    const cases: Array<[string, string]> = [
      ["comma hazard", "Order ORD-90017 for the Aurora Desk Lamp, toxic, was delivered on 2026-11-01. It is unused and unopened. I want a refund."],
      ["field recognized + sentence unknown", "Order ORD-90017\nProduct: Aurora Desk Lamp\nDelivered: 2026-11-01\nIt is unused and unopened. I want a refund. The Toxic Lamp was delivered on 2026-11-01."],
      ["fixture used item", "Order ORD-90017 for the Aurora Desk Lamp was delivered on 2026-11-01. It is unused and unopened. I used it yesterday. I want a refund."],
      ["fixture multi order", "Order ORD-90017 for the Aurora Desk Lamp was delivered on 2026-11-01. Order ORD-90018 for the Cedar Wall Clock was delivered on 2026-11-01. It is unused and unopened. I want a refund."],
      ["fixture expired hazard separate", "Order ORD-90017 for the Aurora Desk Lamp was delivered on 2026-09-01. It is unused and unopened. I want a refund. The lamp is toxic."],
      ["fixture no date", "Order ORD-90017 for the Aurora Desk Lamp. It is unused and unopened. I want a refund."],
    ];
    for (const [, msg] of cases) { const r = triageDemo(msg, AS_OF); expect(r.lane).toBe("review"); }
  });
});
