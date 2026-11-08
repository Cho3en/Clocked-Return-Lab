import { createHash, timingSafeEqual } from "node:crypto";

export function isAuthorized(provided: string | null, configured: string | undefined): boolean {
  if (!provided || !configured || configured.length < 32) return false;
  // Both buffers are fixed length and compared in constant time.
  const hash = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(hash(provided), hash(configured));
}
export class BodyLimitError extends Error {
  constructor() { super("BODY_TOO_LARGE"); }
}
export async function readJsonWithLimit(request: Request, maxBytes = 15_000): Promise<unknown> {
  const headerLength = request.headers.get("content-length");
  if (headerLength && Number(headerLength) > maxBytes) throw new BodyLimitError();
  if (!request.body) throw new SyntaxError("Empty body");
  const reader = request.body.getReader();
  const buffers: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new BodyLimitError();
      }
      buffers.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let pos = 0;
  for (const buffer of buffers) { bytes.set(buffer, pos); pos += buffer.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
type RateState = {
  windowStart: number;
  windowCount: number;
  dayKey: string;
  dayCount: number;
  active: number;
};
const shared = globalThis as typeof globalThis & { __returnLabLimits?: RateState };
function currentState(now: Date): RateState {
  if (!shared.__returnLabLimits) {
    shared.__returnLabLimits = { windowStart: now.getTime(), windowCount: 0,
      dayKey: now.toISOString().slice(0, 10), dayCount: 0, active: 0 };
  }
  const state = shared.__returnLabLimits;
  if (now.getTime() - state.windowStart >= 15 * 60_000) {
    state.windowStart = now.getTime();
    state.windowCount = 0;
  }
  const dayKey = now.toISOString().slice(0, 10);
  if (state.dayKey !== dayKey) { state.dayKey = dayKey; state.dayCount = 0; }
  return state;
}
export function acquireLivePermit(now = new Date()):
  | { allowed: true; release: () => void }
  | { allowed: false; reason: "rate" | "daily" | "concurrency" } {
  const s = currentState(now);
  if (s.windowCount >= 8) return { allowed: false, reason: "rate" };
  if (s.dayCount >= 30) return { allowed: false, reason: "daily" };
  if (s.active >= 2) return { allowed: false, reason: "concurrency" };
  s.windowCount++;
  s.dayCount++;
  s.active++;
  let released = false;
  return { allowed: true, release: () => { if (!released) { s.active--; released = true; } } };
}
// Tests only. Production does not expose a route to reset counters.
export function resetRateLimitsForTests() { delete shared.__returnLabLimits; }
