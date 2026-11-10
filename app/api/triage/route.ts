import { NextResponse } from "next/server";
import { z } from "zod";
import { triageDemo } from "../../../lib/demo";
import { triageLive } from "../../../lib/clocked";
import { businessDate } from "../../../lib/policy";
import { assessLiveGate, LIVE_DISABLED_MESSAGE } from "../../../lib/live-gate";
import { acquireLivePermit, BodyLimitError, isAuthorized, readJsonWithLimit } from "../../../lib/security";

const schema = z.object({
  message: z.string().trim().min(20).max(10_000),
  mode: z.enum(["demo", "live"]),
  asOf: z.iso.date(),
}).strict();
const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: unknown, status = 200, other: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...HEADERS, ...other } });

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json({ error: "Expected application/json." }, 415);
  }
  let payload: unknown;
  try {
    payload = await readJsonWithLimit(request);
  } catch (error) {
    return error instanceof BodyLimitError
      ? json({ error: "Request is too large (15 KB maximum)." }, 413)
      : json({ error: "Invalid JSON or encoding." }, 400);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Enter a message between 20 and 10,000 characters, choose a mode and provide a valid date." }, 400);
  }
  const { message, mode, asOf } = parsed.data;
  if (mode === "demo") {
    try { return json(triageDemo(message, asOf)); }
    catch { return json({ error: "The demo request could not be evaluated." }, 500); }
  }
  const configuredToken = process.env.RETURNLAB_ACCESS_TOKEN;
  if (!configuredToken || configuredToken.length < 32) {
    return json({ error: "Private live access is not configured on the server." }, 503);
  }
  if (!isAuthorized(request.headers.get("x-returnlab-token"), configuredToken)) {
    return json({ error: "Private live access token is missing or invalid." }, 401);
  }
  // Authenticated callers still need the operator to enable live spend. A
  // generic message avoids disclosing which attestation is missing, and the
  // check runs before any Clocked client is created.
  if (!assessLiveGate().ok) {
    return json({ error: LIVE_DISABLED_MESSAGE }, 503);
  }
  const permit = acquireLivePermit();
  if (!permit.allowed) {
    return json({
      error: permit.reason === "daily"
        ? "Daily live-call budget reached. Use demo mode."
        : permit.reason === "concurrency"
          ? "Live analysis is busy. Retry after the current analysis finishes."
          : "Live call limit reached. Try again after 15 minutes.",
    }, 429, { "Retry-After": permit.reason === "daily" ? "3600" : "900" });
  }
  try {
    // Never accept a browser-selected date as authoritative for live decisions.
    const result = await triageLive(message, businessDate());
    return json(result);
  } catch {
    return json({ error: "Clocked failed or returned an invalid response. No recommendation was made." }, 502);
  } finally {
    permit.release();
  }
}
