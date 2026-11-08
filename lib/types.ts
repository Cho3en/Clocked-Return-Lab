export type Lane = "approve" | "review" | "reject";
export type Mode = "demo" | "live";
export type CheckStatus = "pass" | "fail" | "unknown";

export interface EvidenceField {
  id: string;
  label: string;
  value: string;
  start: number;
  end: number;
  confidence: number | null;
}

export interface Assessment {
  id: string;
  label: string;
  answer: boolean | null;
  probability: number | null;
}

export interface PolicyCheck {
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface TriageResult {
  mode: Mode;
  lane: Lane;
  redactedText: string;
  evidence: EvidenceField[];
  assessments: Assessment[];
  checks: PolicyCheck[];
  reasons: string[];
  asOf: string;
  elapsedDays: number | null;
  privacyNotice: string;
  policyNotice: string;
  requestId: string;
}
