import { NextResponse } from "next/server";
import { z } from "zod";
import { triageDemo } from "../../../lib/demo";
import { triageLive } from "../../../lib/clocked";

// Next.js uses Node.js runtime by default; cacheComponents disallows route runtime exports.
const requestSchema = z.object({
  message: z.string().trim().min(20).max(10_000),
  mode: z.enum(["demo", "live"]),
  asOf: z.iso.date(),
}).strict();

export async function POST(request: Request) {
  const bytes = request.headers.get("content-length");
  if (bytes && Number(bytes) > 15_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a message (20–10,000 characters), mode and valid date." }, { status: 400 });
  }
  try {
    const { message, mode, asOf } = parsed.data;
    const result = mode === "demo" ? triageDemo(message, asOf) : await triageLive(message, asOf);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Do not return raw upstream errors, request contents, or credentials to callers.
    const status = error instanceof Error && error.message === "CLOCKED_NOT_CONFIGURED" ? 503 : 502;
    return NextResponse.json({
      error: status === 503 ? "Live Clocked mode is not configured. Add CLOCKED_API_KEY to .env.local and restart." : "Clocked request failed or returned an unexpected response. Use demo mode or check your API configuration.",
    }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
