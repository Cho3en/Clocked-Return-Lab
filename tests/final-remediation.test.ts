import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../app/api/triage/route";
import { classifyCurrentIntent } from "../lib/case-context";
import { triageDemo } from "../lib/demo";
import { assessLiveGate, LIVE_DISABLED_MESSAGE, MAX_ATTESTED_CAP_USD } from "../lib/live-gate";
import { findRefundRequestSpan, hasCurrentRefundRequest, isRefundRequestStatement } from "../lib/refund-intent";
import { resetRateLimitsForTests } from "../lib/security";

const AS_OF = "2026-11-09";
const wrap = (closing: string) =>
  "Subject: Return request for order ORD-24015\n\nMy order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-10-28. It is unused and unopened. " + closing;

/** Every ordinary refund phrasing the independent audit reported as a false Review. */
const CURRENT_REQUESTS = [
  "I would like a refund",
  "I'd like a refund",
  "We would like a refund",
  "I am requesting a refund",
  "I request a refund",
  "We request a refund",
  "Please give me a refund",
  "Please send me a refund",
  "Refund please",
  "Can you refund me?",
  "Could you please refund me?",
  "I want my money back",
  "I want a refund",
  "I need a refund",
  "I would like to get a refund",
  "I would like to receive a refund",
  "Can I get a refund?",
  "Please refund me",
  "I am asking for a refund",
  "I would like to return it for a refund",
  "I want to send it back for a refund",
  "I definitely want a refund",
] as const;

describe("shared refund phrase table", () => {
  it.each(CURRENT_REQUESTS)("treats %s as a current refund request in a complete case", (closing) => {
    const message = wrap(closing);
    expect(classifyCurrentIntent(message)).toBe("refund");
    expect(hasCurrentRefundRequest(closing)).toBe(true);
    expect(isRefundRequestStatement(closing.replace(/[.!?]+$/, ""))).toBe(true);
    const span = findRefundRequestSpan(message);
    expect(span?.value).toBeTruthy();
    expect(message.slice(span!.start, span!.end)).toBe(span!.value);
    const result = triageDemo(message, AS_OF);
    expect(result.lane).toBe("approve");
    expect(result.caseScope?.unclassifiedStatements).toBe(0);
    expect(result.evidence.find((field) => field.id === "request")?.value).toBe(span!.value);
  });

  it("keeps a courtesy close from forcing review", () => {
    for (const closing of ["Thank you.", "Thanks for your help.", "Thanks!"]) {
      const result = triageDemo(wrap("I want a refund. " + closing), AS_OF);
      expect(result.caseScope?.unclassifiedStatements).toBe(0);
      expect(result.lane).toBe("approve");
    }
    expect(classifyCurrentIntent("Thanks for your help.")).not.toBe("refund");
  });

  it("does not turn a question or a quotation into a current request", () => {
    const question = wrap("Can you explain how I request a refund?");
    expect(classifyCurrentIntent(question)).not.toBe("refund");
    expect(hasCurrentRefundRequest("Can you explain how I request a refund")).toBe(false);
    expect(triageDemo(question, AS_OF).lane).toBe("review");

    const quoted = wrap('The support bot wrote "I want a refund" but I do not want one.');
    expect(classifyCurrentIntent(quoted)).not.toBe("refund");
    expect(triageDemo(quoted, AS_OF).lane).toBe("review");
  });

  it("keeps withdrawn and return-only requests out of the refund lane", () => {
    const withdrawn = wrap("Last month I asked for a refund, but I changed my mind.");
    expect(classifyCurrentIntent(withdrawn)).toBe("withdrawn");
    expect(triageDemo(withdrawn, AS_OF).lane).toBe("review");

    const returnOnly = wrap("I want to return it, but not for a refund.");
    expect(classifyCurrentIntent(returnOnly)).toBe("return-only");
    expect(triageDemo(returnOnly, AS_OF).lane).toBe("review");
  });

  it("still abstains when an ordinary report is unclassified or reports a problem", () => {
    expect(triageDemo(wrap("It is a bit large."), AS_OF).lane).toBe("review");
    expect(triageDemo(wrap("But I moved house."), AS_OF).lane).toBe("review");
    expect(triageDemo(wrap("The battery is swollen."), AS_OF).lane).toBe("review");
    expect(triageDemo(wrap("I want a refund. The unit sparked and burned my hand."), AS_OF).lane).toBe("review");
    expect(triageDemo(wrap("I want a refund. My card was charged twice."), AS_OF).lane).toBe("review");
  });
});

describe("labelled delivery dates", () => {
  const sentence = (clause: string) =>
    "Subject: Return request for order ORD-24015\n\nMy order ORD-24015 for the Atlas Desk Lamp " + clause
    + "\nIt is unused and unopened.\nI want a refund.";
  const field = (label: string) =>
    "Subject: Return request for order ORD-24015\n\nOrder: ORD-24015\nProduct: Atlas Desk Lamp\n" + label
    + "\nCondition: unused and unopened\nRequest: please refund me";

  const cases: Array<[string, "sentence" | "field", number]> = [
    ["was delivered on 2026-10-28", "sentence", 12],
    ["Delivery date: 2026-10-28", "field", 12],
    ["delivery date: 2026-10-28", "field", 12],
    ["Delivery date was 2026-10-28", "field", 12],
    ["Delivered: 2026-10-28", "field", 12],
  ];
  it.each(cases)("extracts and applies %s", (label, shape, days) => {
    const result = triageDemo(shape === "field" ? field(label) : sentence(label), AS_OF);
    expect(result.evidence.find((entry) => entry.id === "delivery_date")?.value).toBe("2026-10-28");
    expect(result.elapsedDays).toBe(days);
    expect(result.caseScope?.unclassifiedStatements).toBe(0);
    expect(result.lane).toBe("approve");
  });

  it("reads a labelled request line through the shared phrase table", () => {
    const lines = (request: string) => [
      "Order ORD-24015",
      "Product: Atlas Desk Lamp",
      "Delivered: 2026-10-28",
      "Delivery date: 2026-10-28",
      "Condition: unused and unopened",
      request,
    ].join("\n");
    const accepted = triageDemo(lines("Request: I would like a refund"), AS_OF);
    expect(accepted.caseScope?.unclassifiedStatements).toBe(0);
    expect(accepted.lane).toBe("approve");

    const unrelated = triageDemo(lines("Request: send a free upgrade"), AS_OF);
    expect(unrelated.lane).toBe("review");
  });

  it("keeps date safety checks intact", () => {
    expect(triageDemo(sentence("was delivered on 2027-01-02"), AS_OF).lane).toBe("review");
    expect(triageDemo(sentence("was delivered on 2026-02-31"), AS_OF).lane).toBe("review");
    const conflicting = "Order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-10-28 and on 2026-10-30. It is unused and unopened. I want a refund.";
    expect(triageDemo(conflicting, AS_OF).lane).toBe("review");
    expect(triageDemo("Order ORD-24015 for the Atlas Desk Lamp was delivered on 2026-09-01. It is unused and unopened. I want a refund.", AS_OF).lane).toBe("reject");
  });
});

describe("fail-closed live gate", () => {
  const complete = {
    RETURNLAB_LIVE_ENABLED: "YES",
    CLOCKED_ROTATED_KEY_CONFIRMED: "YES",
    CLOCKED_PROVIDER_HARD_CAP_CONFIRMED: "YES",
    CLOCKED_PROVIDER_HARD_CAP_USD: String(MAX_ATTESTED_CAP_USD),
    CLOCKED_API_KEY: "clk_synthetic_test_value_000000",
  };

  it("allows only the fully attested configuration", () => {
    expect(assessLiveGate(complete)).toEqual({ ok: true, reason: "enabled" });
  });

  it.each([
    ["live flag", { RETURNLAB_LIVE_ENABLED: undefined }, "live-flag"],
    ["live flag value", { RETURNLAB_LIVE_ENABLED: "maybe" }, "live-flag"],
    ["rotation attestation", { CLOCKED_ROTATED_KEY_CONFIRMED: undefined }, "rotation"],
    ["rotation falsified", { CLOCKED_ROTATED_KEY_CONFIRMED: "NO" }, "rotation"],
    ["cap attestation", { CLOCKED_PROVIDER_HARD_CAP_CONFIRMED: undefined }, "cap-attestation"],
    ["cap amount missing", { CLOCKED_PROVIDER_HARD_CAP_USD: undefined }, "cap-amount"],
    ["cap amount above limit", { CLOCKED_PROVIDER_HARD_CAP_USD: "5" }, "cap-amount"],
    ["cap amount not a number", { CLOCKED_PROVIDER_HARD_CAP_USD: "cheap" }, "cap-amount"],
    ["api key missing", { CLOCKED_API_KEY: undefined }, "api-key"],
    ["api key wrong shape", { CLOCKED_API_KEY: "test" }, "api-key"],
  ])("blocks a missing or invalid %s", (_label, override, reason) => {
    const gate = assessLiveGate({ ...complete, ...override });
    expect(gate.ok).toBe(false);
    expect(gate.reason).toBe(reason);
  });
});

describe("live route gating", () => {
  const stripeEnv: string[] = [
    "RETURNLAB_ACCESS_TOKEN",
    "RETURNLAB_LIVE_ENABLED",
    "CLOCKED_ROTATED_KEY_CONFIRMED",
    "CLOCKED_PROVIDER_HARD_CAP_CONFIRMED",
    "CLOCKED_PROVIDER_HARD_CAP_USD",
    "CLOCKED_API_KEY",
  ];
  const TOKEN = "test-access-token-0000000000000000000000";

  beforeEach(() => {
    for (const key of stripeEnv) delete process.env[key];
    resetRateLimitsForTests();
  });
  afterEach(() => {
    for (const key of stripeEnv) delete process.env[key];
    resetRateLimitsForTests();
  });

  const post = async (mode: "demo" | "live", token?: string) => {
    const body = JSON.stringify({ message: wrap("I want a refund."), mode, asOf: AS_OF });
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-returnlab-token"] = token;
    const response = await POST(new Request("http://localhost/api/triage", { method: "POST", headers, body }));
    return { status: response.status, body: (await response.json()) as { error?: string; lane?: string } };
  };

  it("serves demo mode with no configuration at all", async () => {
    const result = await post("demo");
    expect(result.status).toBe(200);
    expect(result.body.lane).toBe("approve");
  });

  it("reports an unconfigured server instead of pretending to be authorized", async () => {
    const result = await post("live", TOKEN);
    expect(result.status).toBe(503);
    expect(result.body.error).toMatch(/not configured/i);
  });

  it("rejects a wrong token before revealing the live gate state", async () => {
    process.env.RETURNLAB_ACCESS_TOKEN = TOKEN;
    const result = await post("live", "not-the-token".padEnd(32, "x"));
    expect(result.status).toBe(401);
    expect(result.body.error).toMatch(/missing or invalid/i);
  });

  it.each([
    ["no attestations", {}],
    ["live disabled", { CLOCKED_ROTATED_KEY_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_USD: "0.05", CLOCKED_API_KEY: "clk_synthetic_test_value_000000" }],
    ["rotation unconfirmed", { RETURNLAB_LIVE_ENABLED: "YES", CLOCKED_PROVIDER_HARD_CAP_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_USD: "0.05", CLOCKED_API_KEY: "clk_synthetic_test_value_000000" }],
    ["cap unconfirmed", { RETURNLAB_LIVE_ENABLED: "YES", CLOCKED_ROTATED_KEY_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_USD: "0.05", CLOCKED_API_KEY: "clk_synthetic_test_value_000000" }],
    ["cap too high", { RETURNLAB_LIVE_ENABLED: "YES", CLOCKED_ROTATED_KEY_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_USD: "10", CLOCKED_API_KEY: "clk_synthetic_test_value_000000" }],
    ["no api key", { RETURNLAB_LIVE_ENABLED: "YES", CLOCKED_ROTATED_KEY_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_CONFIRMED: "YES", CLOCKED_PROVIDER_HARD_CAP_USD: "0.05" }],
  ])("blocks authorized live calls with %s and never reaches the provider", async (_label, env) => {
    process.env.RETURNLAB_ACCESS_TOKEN = TOKEN;
    Object.assign(process.env, env);
    const result = await post("live", TOKEN);
    expect(result.status).toBe(503);
    expect(result.body.error).toBe(LIVE_DISABLED_MESSAGE);
    // A 502 would mean the provider path was reached and failed.
    expect(result.body.error).not.toMatch(/Clocked failed/i);
  });
});
