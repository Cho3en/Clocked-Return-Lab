/**
 * Fail-closed gate for paid Clocked live analysis.
 *
 * A configured API key is not permission to spend money. Live mode stays
 * unavailable until an operator explicitly enables it, attests that the key
 * was rotated after the documented exposure, and attests that the provider
 * account enforces a small hard spend cap. The application cannot verify the
 * provider-side cap itself, so the attestation is recorded, not inferred.
 *
 * A blocked request never contacts Clocked.
 */

export const LIVE_DISABLED_MESSAGE = "Live Clocked analysis is not enabled on this server. Demo mode remains available.";

/** Highest upstream cap the operator may attest to, in US dollars. */
export const MAX_ATTESTED_CAP_USD = 0.05;

export type LiveGateEnv = Record<string, string | undefined>;

export interface LiveGateResult {
  ok: boolean;
  /** Operator-facing reason code. Never returned to the browser. */
  reason: "enabled" | "live-flag" | "rotation" | "cap-attestation" | "cap-amount" | "api-key";
}

const isAttested = (value: string | undefined) => (value ?? "").trim().toUpperCase() === "YES";

export function assessLiveGate(env: LiveGateEnv = process.env): LiveGateResult {
  if (!isAttested(env.RETURNLAB_LIVE_ENABLED)) return { ok: false, reason: "live-flag" };
  if (!isAttested(env.CLOCKED_ROTATED_KEY_CONFIRMED)) return { ok: false, reason: "rotation" };
  if (!isAttested(env.CLOCKED_PROVIDER_HARD_CAP_CONFIRMED)) return { ok: false, reason: "cap-attestation" };
  const cap = Number((env.CLOCKED_PROVIDER_HARD_CAP_USD ?? "").trim());
  if (!Number.isFinite(cap) || cap <= 0 || cap > MAX_ATTESTED_CAP_USD) return { ok: false, reason: "cap-amount" };
  const key = (env.CLOCKED_API_KEY ?? "").trim();
  if (!/^clk_[A-Za-z0-9_-]{8,}$/.test(key)) return { ok: false, reason: "api-key" };
  return { ok: true, reason: "enabled" };
}
