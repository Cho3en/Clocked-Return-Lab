import "server-only";
import { Clocked } from "clocked-sdk";
import { triageWithClocked } from "./pipeline";
import type { TriageResult } from "./types";

export async function triageLive(message: string, asOf: string): Promise<TriageResult> {
  const apiKey = process.env.CLOCKED_API_KEY;
  if (!apiKey || !apiKey.trim()) throw new Error("CLOCKED_NOT_CONFIGURED");
  const clocked = new Clocked({ apiKey, maxAttempts: 2, timeout: 90_000 });
  return triageWithClocked(clocked, message, asOf);
}
