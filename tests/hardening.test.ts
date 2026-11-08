import { beforeEach, describe, expect, it } from "vitest";
import { triageDemo } from "../lib/demo";
import { classifyInjectionRisk, codePointOffsetToUtf16, normalizeAssessments, normalizeFields } from "../lib/evidence";
import { businessDate, elapsedDays, evaluatePolicy, hasRightsOrIssue, isUnusedClaim, isAffirmativeReturnRequest } from "../lib/policy";
import { scrubRemainingIdentifiers } from "../lib/privacy";
import { acquireLivePermit, BodyLimitError, isAuthorized, readJsonWithLimit, resetRateLimitsForTests } from "../lib/security";

const asOf = "2026-11-08";
const msg = (s: string) => "Order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-10-27. " + s;
describe("Decision safety regressions", () => {
  it.each([
    ["support without return", "Order ORD-24015 was delivered on 2026-09-01. I need troubleshooting support, not a refund."],
    ["website help", "Order ORD-24015 was delivered on 2026-09-01. How do I change the website language? This is not a return request."],
    ["wrong item", msg("The shop sent the wrong item. It is unused and unopened. I want a refund.")],
    ["consumer rights", msg("It is unused and unopened. I want a refund under my consumer rights.")],
    ["missing parts", msg("Some accessories are missing. It is unused and unopened. I want a refund.")],
    ["not as described", msg("It is not as described. It is unused and unopened. I want a refund.")],
    ["future delivery", "Order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-11-15. It is unused and unopened. I want a refund."],
    ["no affirmative intent", msg("It is unused and unopened. I only want technical help, not a return or refund.")],
    ["conflicting condition", msg("It is unused and unopened, but I used it yesterday. I want a refund.")],
    ["explicit not unused", msg("It is not unused and was already opened. I want a refund.")],
    ["refund policy question", msg("It is unused and unopened. I want to know your refund policy, not request a refund.")],
    ["non-refund request", msg("It is unused and unopened. I want to know how returns work. I am not requesting a refund.")],
  ])("%s routes to human review", (_label, message) => {
    expect(triageDemo(message, asOf).lane).toBe("review");
  });
  it.each([
    "It is unused and unopened. I have not used it. I want a refund.",
    "It is unused and unopened and not damaged. I want a refund.",
    "It is unused and unopened and I never used it. I want a refund.",
  ])("does not mistake an explicit negation for a product defect/use: %s", (s) => {
    expect(triageDemo(msg(s), asOf).lane).toBe("approve");
  });
  it("allows decline ONLY with complete return evidence", () => {
    const old = "Order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-09-01. It is unused and unopened. I want a refund.";
    expect(triageDemo(old, asOf).lane).toBe("reject");
    expect(triageDemo(old.replace("I want a refund.", "I need troubleshooting, not a refund."), asOf).lane).toBe("review");
    expect(triageDemo(old.replace("for the Atlas Desk Lamp ", ""), asOf).lane).toBe("review");
  });
  it("recognizes affirmative refunds and excludes inquiries about the refund policy", () => {
    expect(isAffirmativeReturnRequest("I want to know your refund policy.")).toBe(false);
    expect(isAffirmativeReturnRequest("I want to know your refund policy, not request a refund.")).toBe(false);
    expect(isAffirmativeReturnRequest("I would like to return it for a refund.")).toBe(true);
    expect(isAffirmativeReturnRequest("Can I get a refund?")).toBe(true);
    expect(isAffirmativeReturnRequest("I want a refund.")).toBe(true);
  });
  it("handles a 30-day boundary and future dates", () => {
    expect(elapsedDays("2026-10-09", asOf)).toBe(30);
    expect(elapsedDays("2026-10-08", asOf)).toBe(31);
    expect(elapsedDays("2026-11-09", asOf)).toBe(-1);
  });
  it("checks negations for actual semantics", () => {
    expect(isUnusedClaim("It is unused and not used.")).toBe(true);
    expect(isUnusedClaim("It is not unused.")).toBe(false);
    expect(hasRightsOrIssue("This is not damaged.")).toBe(false);
    expect(hasRightsOrIssue("I received the wrong item.")).toBe(true);
    expect(hasRightsOrIssue("The lamp is not working.")).toBe(true);
  });
  it("uses the server's Europe/Zagreb calendar day", () => {
    expect(businessDate(new Date("2026-11-08T23:30:00.000Z"))).toBe("2026-11-09");
    expect(businessDate(new Date("2026-07-08T22:30:00.000Z"))).toBe("2026-07-09");
  });
});
describe("Strict evidence and Clocked response interpretation", () => {
  const source = msg("It is unused and unopened. I want a refund.");
  const values: Record<string, string> = {
    order_id: "ORD-24015",
    product: "Atlas Desk Lamp",
    delivery_date: "2026-10-27",
    condition: "unused and unopened",
    request: "I want a refund",
  };
  function makeEvidence(probability: number | null) {
    const raw: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(values)) {
      const start = source.indexOf(value);
      raw[id] = { value, start, end: start + value.length, ...(probability === null ? {} : { p_verify: probability }) };
    }
    return normalizeFields(source, raw);
  }
  const goodAssessments = normalizeAssessments({
    refund_requested: { type: "noul", noul: 0.995 },
    item_explicitly_unused: { type: "noul", noul: 0.994 },
    damaged_or_defective: { type: "noul", noul: 0.006 },
  });
  function evaluate(confidence: number | null) {
    return evaluatePolicy({ mode: "live", redactedText: source, evidence: makeEvidence(confidence),
      assessments: goodAssessments, asOf, requestId: "TEST", injectionFlag: false });
  }
  it("approves only strongly grounded source-aligned values", () => {
    expect(evaluate(0.999).lane).toBe("approve");
    expect(evaluate(0.001).lane).toBe("review");
    expect(evaluate(null).lane).toBe("review");
    expect(evaluate(0.749).lane).toBe("review");
    expect(evaluate(0.75).lane).toBe("approve");
  });
  it("abstains on ambiguous probabilities rather than a 0.5 guess", () => {
    const uncertain = normalizeAssessments({
      refund_requested: { type: "noul", noul: 0.7, decision: true },
      item_explicitly_unused: { type: "noul", noul: 0.8 },
      damaged_or_defective: { type: "noul", noul: 0.22 },
    });
    expect(uncertain.map(a => a.answer)).toEqual([null, true, null]);
    expect(evaluatePolicy({mode:"live",redactedText:source,evidence:makeEvidence(1),assessments:uncertain,asOf,requestId:"T",injectionFlag:false}).lane).toBe("review");
  });
  it("normalizes Clocked code-point offsets, including astral Unicode", () => {
    for (const prefix of ["🛒 ", "🛒🛍️ ", "Česká 🛒 ", "Клиент 🛒 ", "汉字 🤖 "]) {
      const text = prefix + "Order ORD-24015 was delivered on 2026-10-27.";
      const target = "ORD-24015";
      const jsStart = text.indexOf(target);
      const cpStart = [...text.slice(0, jsStart)].length;
      const cpEnd = cpStart + [...target].length;
      expect(codePointOffsetToUtf16(text, cpStart)).toBe(jsStart);
      const evidence = normalizeFields(text, {order_id: {value:target,start:cpStart,end:cpEnd,p_verify:0.95}}, "codepoint");
      expect(evidence).toHaveLength(1);
      expect(evidence[0].start).toBe(jsStart);
      expect(evidence[0].end).toBe(jsStart + target.length);
    }
  });
  it("rejects wrong offsets, nulls and guessed extractions", () => {
    expect(normalizeFields("🛒 ORD-24015", {order_id: {value:"ORD-24015",start:0,end:9}}, "codepoint")).toHaveLength(0);
    expect(normalizeFields("ORD-24015", {order_id: {value:"ORD-24016",start:0,end:9}}, "utf16")).toHaveLength(0);
    expect(codePointOffsetToUtf16("🛒", 3)).toBeNull();
  });
  it("treats suspicious, marginal and invalid Guard scores conservatively", () => {
    expect(classifyInjectionRisk({injection:0.99,threshold:0.5})).toBe(true);
    expect(classifyInjectionRisk({injection:0.47,threshold:0.5})).toBeNull();
    expect(classifyInjectionRisk({injection:0.01,threshold:0.5})).toBe(false);
    expect(classifyInjectionRisk({injection:"oops",threshold:0.5})).toBeNull();
  });
});
describe("Privacy defense in depth", () => {
  it("masks obvious identifiers without removing order references and dates", () => {
    const original = "Email user@example.com, SSN 123-45-6789, card 4111 1111 1111 1111, order ORD-24015 delivered 2026-10-27.";
    const masked = scrubRemainingIdentifiers(original);
    expect(masked).not.toContain("user@example.com");
    expect(masked).not.toContain("123-45-6789");
    expect(masked).not.toContain("4111 1111 1111 1111");
    expect(masked).toContain("ORD-24015");
    expect(masked).toContain("2026-10-27");
  });
  it("scrubs IBAN and international phone patterns", () => {
    const masked = scrubRemainingIdentifiers("IBAN DE89370400440532013000; call +385 91 123 4567.");
    expect(masked).not.toContain("DE89370400440532013000");
    expect(masked).not.toContain("+385 91 123 4567");
  });
});
describe("Access, size limits and metering", () => {
  beforeEach(() => resetRateLimitsForTests());
  it("requires a 32+ character configured secret and a matching caller secret", () => {
    const good = "a".repeat(43);
    expect(isAuthorized(good,good)).toBe(true);
    expect(isAuthorized(good,"b".repeat(43))).toBe(false);
    expect(isAuthorized("guess",good)).toBe(false);
    expect(isAuthorized(good,undefined)).toBe(false);
    expect(isAuthorized("tiny","tiny")).toBe(false);
  });
  it("reads well-formed JSON safely", async () => {
    const req = new Request("https://local.invalid/",{method:"POST",body:JSON.stringify({x:12})});
    await expect(readJsonWithLimit(req)).resolves.toEqual({x:12});
  });
  it("rejects streamed oversized payloads even with no Content-Length header", async () => {
    const req = new Request("https://local.invalid/",{method:"POST",body:"x".repeat(15001)});
    await expect(readJsonWithLimit(req)).rejects.toBeInstanceOf(BodyLimitError);
  });
  it("rejects malformed JSON and invalid UTF-8", async () => {
    const malformed = new Request("https://local.invalid/",{method:"POST",body:"{oops"});
    await expect(readJsonWithLimit(malformed)).rejects.toThrow();
    const invalid = new Request("https://local.invalid/",{method:"POST",body:new Uint8Array([0xff,0xfe,0xfd])});
    await expect(readJsonWithLimit(invalid)).rejects.toThrow();
  });
  it("limits active live calls to two, and rates to eight per fifteen minutes", () => {
    const now = new Date("2026-11-08T20:00:00Z");
    const a = acquireLivePermit(now);
    const b = acquireLivePermit(now);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(acquireLivePermit(now)).toMatchObject({allowed:false,reason:"concurrency"});
    if (a.allowed) a.release();
    if (b.allowed) b.release();
    for (let i = 0; i < 6; i++) {
      const p = acquireLivePermit(now);
      expect(p.allowed).toBe(true);
      if (p.allowed) p.release();
    }
    expect(acquireLivePermit(now)).toMatchObject({allowed:false,reason:"rate"});
  });
  it("enforces the daily 30 request budget even when the window resets", () => {
    const start = Date.parse("2026-11-08T00:00:00Z");
    for(let i=0;i<30;i++){
      const p = acquireLivePermit(new Date(start+Math.floor(i/7)*15*60_001));
      expect(p.allowed).toBe(true);
      if(p.allowed)p.release();
    }
    expect(acquireLivePermit(new Date(start+3*60*60_000))).toMatchObject({allowed:false,reason:"daily"});
  });
});
