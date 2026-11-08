import { describe, expect, it, vi } from "vitest";
import { triageWithClocked, type ClockedServices } from "../lib/pipeline";

const date = "2026-11-08";
const emailText = "Order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-10-27. It is unused and unopened. I want a refund. Email: maya@example.com";
function fakeClocked(options: { guardScore?: number; guardFail?: boolean; protectedText?: string; extractionConfidence?: number } = {}) {
  const actions: string[] = [];
  const text = options.protectedText ?? emailText;
  const pii = vi.fn(async () => {
    actions.push("protect");
    return { data: { anonymized_text: text } };
  });
  const injection = vi.fn(async () => {
    actions.push("guard");
    if (options.guardFail) throw new Error("Guard outage");
    return { data: { injection: options.guardScore ?? 0.005, threshold: 0.5 } };
  });
  const extract = vi.fn(async ({text: input}: {text: string}) => {
    actions.push("extract");
    const values: Record<string, string> = {
      order_id:"ORD-24015",
      product:"Atlas Desk Lamp",
      delivery_date:"2026-10-27",
      condition:"unused and unopened",
      request:"I want a refund",
    };
    const fields: Record<string, unknown> = {};
    for (const [id,value] of Object.entries(values)) {
      const utf16 = input.indexOf(value);
      const start = [...input.slice(0,utf16)].length;
      fields[id] = { value,start,end:start+[...value].length,p_verify:options.extractionConfidence ?? 0.999 };
    }
    return { data: { fields } };
  });
  const decide = vi.fn(async () => {
    actions.push("decide");
    return { data: { answers: {
      refund_requested: {type:"noul",noul:0.997},
      item_explicitly_unused: {type:"noul",noul:0.994},
      damaged_or_defective: {type:"noul",noul:0.003},
    } } };
  });
  const client = { pii, injection, extract, decide } as unknown as ClockedServices;
  return { actions, client, pii, injection, extract, decide };
}
describe("Clocked integration sequencing with mocked service responses", () => {
  it("runs Guard to completion before either Extract or Decide", async () => {
    const mock = fakeClocked();
    const result = await triageWithClocked(mock.client, emailText, date);
    expect(mock.actions).toEqual(["protect","guard","extract","decide"]);
    expect(result.lane).toBe("approve");
  });
  it("never calls Extract or Decide on dangerous Guard output", async () => {
    const mock = fakeClocked({guardScore:0.99});
    const result = await triageWithClocked(mock.client,emailText,date);
    expect(result.lane).toBe("review");
    expect(mock.actions).toEqual(["protect","guard"]);
    expect(mock.extract).not.toHaveBeenCalled();
    expect(mock.decide).not.toHaveBeenCalled();
  });
  it("never calls Extract or Decide when Guard fails", async () => {
    const mock = fakeClocked({guardFail:true});
    const result = await triageWithClocked(mock.client,emailText,date);
    expect(result.lane).toBe("review");
    expect(mock.actions).toEqual(["protect","guard"]);
  });
  it("never processes PII failures further", async () => {
    const mock = fakeClocked();
    mock.pii.mockRejectedValueOnce(new Error("PII outage"));
    await expect(triageWithClocked(mock.client,emailText,date)).rejects.toThrow("PII outage");
    expect(mock.injection).not.toHaveBeenCalled();
    expect(mock.extract).not.toHaveBeenCalled();
  });
  it("masks leftover email before any downstream service calls", async () => {
    const mock = fakeClocked();
    const result = await triageWithClocked(mock.client,emailText,date);
    const guardedText = (mock.injection.mock.calls[0] as unknown as [{text:string}])[0].text;
    const extractedText = (mock.extract.mock.calls[0] as unknown as [{text:string}])[0].text;
    expect(guardedText).not.toContain("maya@example.com");
    expect(extractedText).not.toContain("maya@example.com");
    expect(result.redactedText).toContain("[EMAIL]");
    expect(result.redactedText).not.toContain("maya@example.com");
  });
  it("holds a low confidence extraction for human review", async () => {
    const mock = fakeClocked({extractionConfidence:0.05});
    const result = await triageWithClocked(mock.client,emailText,date);
    expect(result.lane).toBe("review");
  });
  it("corrects service Unicode offsets before policy and UI", async () => {
    const mock = fakeClocked({protectedText:"🛒 " + emailText});
    const result = await triageWithClocked(mock.client,emailText,date);
    expect(result.lane).toBe("approve");
    expect(result.evidence.find(e=>e.id==="order_id")?.start).toBe(9);
    expect(result.redactedText.slice(9,18)).toBe("ORD-24015");
  });
});
