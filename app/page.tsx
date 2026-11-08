"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity, ArrowRight, CheckCircle2, ChevronDown, CircleAlert, CircleHelp,
  Clock3, FileSearch, Fingerprint, LockKeyhole, RotateCcw, ShieldAlert,
  ShieldCheck, Sparkles, XCircle, Zap,
} from "lucide-react";
import { createSamples } from "../lib/samples";
import type { EvidenceField, Lane, Mode, TriageResult } from "../lib/types";

const lanes: { id: Lane; title: string; subtitle: string }[] = [
  { id: "approve", title: "Approve", subtitle: "Advisory only" },
  { id: "review", title: "Review", subtitle: "Human required" },
  { id: "reject", title: "Decline", subtitle: "Policy advisory" },
];

function asPercentage(value: number | null) {
  return value === null ? "Not supplied" : (value * 100).toFixed(1) + "%";
}

function dayToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function EvidenceText({ text, evidence }: { text: string; evidence: EvidenceField[] }) {
  const nodes: ReactNode[] = [];
  const ordered = [...evidence].sort((a, b) => a.start - b.start);
  let cursor = 0;
  ordered.forEach((entry) => {
    if (entry.start < cursor || entry.end > text.length || text.slice(entry.start, entry.end) !== entry.value) return;
    if (entry.start > cursor) nodes.push(<span key={"t" + cursor}>{text.slice(cursor, entry.start)}</span>);
    nodes.push(<mark key={entry.id + entry.start} title={entry.label} className="evidence-mark">{text.slice(entry.start, entry.end)}</mark>);
    cursor = entry.end;
  });
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  return <p className="whitespace-pre-wrap break-words text-[13px] leading-7 text-slate-300">{nodes}</p>;
}

function StatusIcon({ status }: { status: "pass" | "fail" | "unknown" }) {
  return status === "pass"
    ? <CheckCircle2 size={17} className="shrink-0 text-emerald-400" aria-label="Passed" />
    : status === "fail"
      ? <XCircle size={17} className="shrink-0 text-rose-400" aria-label="Failed" />
      : <CircleHelp size={17} className="shrink-0 text-amber-400" aria-label="Needs review" />;
}

function LaneStrip({ selected }: { selected: Lane | null }) {
  return (
    <div className="route-strip" role="group" aria-label="Available recommendation routes">
      {lanes.map((lane) => (
        <div key={lane.id} className={"route-cell route-" + lane.id + (selected === lane.id ? " route-selected" : "")}>
          <span className="route-dot" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold">{lane.title}</span>
            <span className="mt-0.5 block text-[10px] text-slate-500">{lane.subtitle}</span>
          </span>
          {selected === lane.id && <CheckCircle2 size={15} className="ml-auto shrink-0" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

function DetailSection({ label, title, count, children }: { label: string; title: string; count?: string; children: ReactNode }) {
  return (
    <details className="detail-panel">
      <summary className="detail-toggle">
        <span className="flex min-w-0 items-center gap-3">
          <span className="detail-number">{label}</span>
          <span className="text-[14px] font-semibold tracking-tight text-slate-100">{title}</span>
        </span>
        <span className="flex items-center gap-3">
          {count && <span className="text-[11px] text-slate-500">{count}</span>}
          <ChevronDown size={16} className="detail-chevron shrink-0 text-slate-400" aria-hidden="true" />
        </span>
      </summary>
      <div className="detail-content">{children}</div>
    </details>
  );
}

const pipeline: { title: string; icon: typeof ShieldCheck }[] = [
  { title: "Protect", icon: ShieldCheck },
  { title: "Guard", icon: ShieldAlert },
  { title: "Extract", icon: FileSearch },
  { title: "Decide", icon: Sparkles },
  { title: "Route", icon: Fingerprint },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("demo");
  const [email, setEmail] = useState("");
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [asOf, setAsOf] = useState("");
  const samples = useMemo(() => asOf ? createSamples(asOf) : [], [asOf]);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestEpoch, setRequestEpoch] = useState(0);
  const [accessToken, setAccessToken] = useState("");
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const date = dayToday();
      const first = createSamples(date)[0];
      setAsOf(date);
      setEmail(first.message);
      setActiveSample(first.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => () => { pending.current?.abort(); }, []);
  useEffect(() => {
    if (!result || !outputRef.current) return;
    // A completed result should be visible on a phone without requiring another long scroll.
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      outputRef.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestEpoch, result]);

  function invalidate() {
    sequence.current++;
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setResult(null);
    setError("");
  }

  const summary = useMemo(() => {
    if (!result) return null;
    const label = result.lane === "approve" ? result.mode === "demo" ? "Eligible under demo rules" : "Eligible under example policy" : result.lane === "reject" ? "Outside the return window" : "Escalate to a human";
    const description = result.lane === "approve"
      ? "The customer-reported case passes the illustrative policy gates. No refund has been issued."
      : result.lane === "reject"
        ? "The customer-reported delivery date is outside the example window. No return has been declined in a store."
        : "This case has uncertainty or an exception and should not be decided automatically.";
    const nextAction = result.lane === "approve"
      ? "Verify the order, delivery and applicable policy before taking any action."
      : result.lane === "reject"
        ? "Check the merchant policy, statutory rights and order history before responding."
        : "Resolve the flagged evidence or exception with a person.";
    return { label, description, nextAction };
  }, [result]);

  async function analyze() {
    pending.current?.abort();
    const controller = new AbortController();
    const requestNumber = ++sequence.current;
    pending.current = controller;
    setBusy(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(mode === "live" ? { "x-returnlab-token": accessToken } : {}) },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ message: email, mode, asOf }),
      });
      const data: unknown = await response.json();
      if (controller.signal.aborted || sequence.current !== requestNumber) return;
      if (!response.ok) {
        const err = data as { error?: string };
        throw new Error(err.error ?? "Unable to analyze this request.");
      }
      setResult(data as TriageResult);
      setRequestEpoch((n) => n + 1);
    } catch (e) {
      if (controller.signal.aborted || sequence.current !== requestNumber) return;
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      if (sequence.current === requestNumber) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  function chooseSample(id: string) {
    const sample = samples.find((s) => s.id === id);
    if (sample) { invalidate(); setEmail(sample.message); setActiveSample(id); }
  }
  function reset() { invalidate(); setEmail(""); setActiveSample(null); }

  const pendingChecks = result?.checks.filter((c) => c.status !== "pass") ?? [];
  const visibleReason = result?.reasons.find((reason) => /review|missing|uncertain|multiple|conflict|issue|ambig|right|date|order|product|intent/i.test(reason))
    ?? result?.reasons[0];

  return (
    <main className="app-shell min-h-screen text-slate-100">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1376px] px-4 pb-16 pt-4 sm:px-7 sm:pt-6 lg:px-10">
        <header className="site-header">
          <div className="flex min-w-0 items-center gap-3">
            <div className="brand-icon"><Clock3 size={21} strokeWidth={2.2} aria-hidden="true" /></div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-extrabold tracking-[.13em] text-white sm:text-[14px]">CLOCKED <span className="font-medium text-slate-400">/ RETURN LAB</span></div>
              <div className="mt-0.5 text-[10px] font-medium tracking-[.13em] text-slate-500">EVIDENCE-LED TRIAGE</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="safe-chip"><span className="safe-dot" /> No refunds executed</div>
            <div className="mode-selector" role="group" aria-label="Analysis mode">
              <button type="button" aria-pressed={mode === "demo"} className={"mode-tab " + (mode === "demo" ? "mode-active" : "")} onClick={() => { invalidate(); setMode("demo"); }}>Demo fixtures</button>
              <button type="button" aria-pressed={mode === "live"} className={"mode-tab " + (mode === "live" ? "mode-active" : "")} onClick={() => { invalidate(); setMode("live"); }}>Clocked live</button>
            </div>
          </div>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow flex items-center gap-2"><Zap size={14} className="text-cyan-300" aria-hidden="true" /> THE DECISION WORKSPACE</div>
          <h1 id="page-title" className="intro-title">Returns, routed <span className="accent-text">with reason.</span></h1>
          <p className="intro-copy">From an unstructured customer message to an explainable, provisional recommendation. Detect conflicts before they become decisions.</p>
          <div className="pipeline" aria-label="Analysis pipeline">
            {pipeline.map(({ title, icon: Icon }, i) => (
              <div key={title} className="pipeline-step">
                <span className="pipeline-index">{String(i + 1).padStart(2, "0")}</span>
                <Icon size={14} aria-hidden="true" />
                <span>{title}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="workspace-grid">
          <section className="surface input-card" aria-labelledby="input-heading">
            <div className="panel-header">
              <div>
                <div className="eyebrow">01 / INPUT</div>
                <h2 id="input-heading" className="panel-title">Customer request</h2>
              </div>
              <span className="header-meta"><Activity size={14} aria-hidden="true" /> {mode === "demo" ? "Synthetic demo" : "Private live"}</span>
            </div>
            <div className="panel-body">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="return-message" className="field-label">Incoming message</label>
                <button type="button" onClick={reset} className="subtle-action"><RotateCcw size={14} aria-hidden="true" /> Clear</button>
              </div>
              <textarea id="return-message" value={email} spellCheck={false} onChange={(e) => { invalidate(); setEmail(e.target.value); setActiveSample(null); }} placeholder="Paste a synthetic customer return message..." className="message-input mt-2.5 min-h-[194px] w-full resize-y rounded-xl px-4 py-3 text-[13px] leading-[1.8] sm:min-h-[224px]" />
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
                <span>{email.length.toLocaleString()} / 10,000 characters</span>
                <span>Not stored by this application</span>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="eyebrow !text-slate-400">TRY A SCENARIO</span>
                  <span className="text-[11px] text-slate-500">One click to load</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {samples.map((sample) => (
                    <button key={sample.id} type="button" title={sample.tag} aria-pressed={activeSample === sample.id}
                      onClick={() => chooseSample(sample.id)}
                      className={"sample-button " + (activeSample === sample.id ? "sample-active" : "")}>
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "live" && (
                <div className="mt-5">
                  <label htmlFor="live-access-token" className="field-label">Private live access token</label>
                  <input id="live-access-token" aria-label="Private live access token" type="password" autoComplete="off" spellCheck={false}
                    value={accessToken} onChange={(e) => { invalidate(); setAccessToken(e.target.value); }}
                    placeholder="From your local .env.local" className="message-input mt-2 w-full rounded-xl px-4 py-3 text-[13px]" />
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">Kept in this tab’s memory, not saved to browser storage. Do not share or commit it.</p>
                </div>
              )}

              <div className="mt-6 flex flex-col justify-between gap-3 border-t border-white/[.08] pt-5 sm:flex-row sm:items-end">
                <div>
                  <label htmlFor="policy-date" className="field-label">{mode === "live" ? "Date is server-controlled" : "Evaluation date"}</label>
                  <input id="policy-date" type="date" value={asOf} disabled={mode === "live"} onChange={(e) => { invalidate(); setAsOf(e.target.value); }}
                    className="date-input mt-2 h-11 rounded-xl px-3 text-[12px]" />
                </div>
                <button type="button" onClick={analyze} disabled={busy || email.trim().length < 20 || email.length > 10000 || !asOf || (mode === "live" && accessToken.length < 32)}
                  className="primary-button group inline-flex min-h-[47px] items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-45">
                  {busy ? <span className="busy-indicator" aria-hidden="true" /> : <Zap size={15} aria-hidden="true" />}
                  <span>{busy ? "Analyzing request..." : mode === "live" ? "Run Clocked analysis" : "Run demo analysis"}</span>
                  {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />}
                </button>
              </div>
              <div aria-live="polite" aria-atomic="true" role="status" className="mt-3 min-h-[18px] text-[11px] text-slate-400">
                {busy ? "Analyzing the current message. No refund will be executed." : result ? "Analysis complete. The recommendation is " + lanes.find((l) => l.id === result.lane)?.title + "." : ""}
              </div>
              {error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-[12px] text-rose-200">{error}</p>}
              <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                {mode === "live"
                  ? "Live requests consume Clocked credits and use the server date. Protect masking is best-effort. Use only authorized data."
                  : "Simulated mode uses local heuristics, not real Clocked calls. Use synthetic messages only."}
              </p>
            </div>
          </section>

          <section ref={outputRef} id="decision-panel" className="surface result-card scroll-mt-4" aria-labelledby="result-heading">
            <div className="panel-header">
              <div>
                <div className="eyebrow">02 / OUTCOME</div>
                <h2 id="result-heading" className="panel-title">Decision routing</h2>
              </div>
              <span className={"result-chip " + (result ? "chip-ready" : "")}>{result ? result.mode === "demo" ? "SIMULATED" : "CLOCKED LIVE" : "READY"}</span>
            </div>
            <div className="panel-body">
              {result && summary ? (
                <div key={requestEpoch} className={"recommendation recommendation-" + result.lane}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] opacity-85">
                      {result.lane === "review" ? <CircleAlert size={17} /> : result.lane === "approve" ? <CheckCircle2 size={17} /> : <ShieldAlert size={17} />}
                      Provisional recommendation
                    </div>
                    <span className="text-[10px] font-medium tracking-wide opacity-60">{result.requestId}</span>
                  </div>
                  <h3 className="mt-4 text-[clamp(22px,3vw,29px)] font-semibold leading-[1.18] tracking-[-.035em]">{summary.label}</h3>
                  <p className="mt-2 max-w-[470px] text-[12px] leading-6 opacity-80">{summary.description}</p>
                  <div className="recommendation-next mt-5">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[.13em] opacity-70">Next human action</span>
                    <span className="text-[12px] leading-5">{summary.nextAction}</span>
                  </div>
                </div>
              ) : (
                <div className={"waiting-panel " + (busy ? "waiting-busy" : "")}>
                  <div className="waiting-orb"><FileSearch size={27} strokeWidth={1.8} aria-hidden="true" /></div>
                  <div className="mt-3 text-[16px] font-semibold tracking-tight text-slate-200">
                    {busy ? "Checking the evidence" : "Ready when you are"}
                  </div>
                  <p className="mt-2 max-w-[280px] text-center text-[12px] leading-5 text-slate-500">
                    {busy ? "Examining claims, intent, safety concerns and policy gates." : "Run a synthetic request to see a recommendation and what needs human attention."}
                  </p>
                </div>
              )}
              <div className="mt-4">
                <LaneStrip selected={result?.lane ?? null} />
              </div>
              {result && (
                <div className="case-summary mt-4">
                  <div className="case-summary-cell">
                    <span className="mini-label">Claimed order</span>
                    <strong className="mt-1 block truncate text-[13px] font-semibold text-slate-200">{result.caseScope?.linkedOrderId ?? "Unresolved"}</strong>
                  </div>
                  <div className="case-summary-cell">
                    <span className="mini-label">Reported delivery age</span>
                    <strong className="mt-1 block text-[13px] font-semibold text-slate-200">{result.elapsedDays === null ? "Unknown" : result.elapsedDays + " days"}</strong>
                  </div>
                  <div className="case-summary-cell">
                    <span className="mini-label">Checks needing attention</span>
                    <strong className={"mt-1 block text-[13px] font-semibold " + (pendingChecks.length ? "text-amber-300" : "text-emerald-300")}>{pendingChecks.length}</strong>
                  </div>
                </div>
              )}
              {result && visibleReason && result.lane === "review" && (
                <div className="attention-line mt-4"><CircleAlert size={16} className="shrink-0 text-amber-300" aria-hidden="true" /><p className="text-[12px] leading-5">{visibleReason}</p></div>
              )}
              <div className="mt-4 flex items-start gap-2 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-slate-500">
                <LockKeyhole size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>Advisory routing only. Customer claims are not verified against store records. No payments, emails or order changes are made.</span>
              </div>
            </div>
          </section>
        </div>

        {result && (
          <section className="mt-5" aria-label="Case evidence and decision details">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <div className="eyebrow">03 / INSPECT</div>
                <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-slate-200">Why this route?</h2>
              </div>
              <span className="text-[11px] text-slate-500">Expand only what you need</span>
            </div>
            <div className="details-grid">
              <DetailSection label="01" title="Source-linked extraction" count={result.evidence.length + " exact spans"}>
                <div className="source-text"><EvidenceText text={result.redactedText} evidence={result.evidence} /></div>
                <div className="mt-3 text-[11px] leading-5 text-slate-500">Highlights match character offsets in protected text. They confirm what the customer wrote, not whether a claim is true.</div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {result.evidence.map((entry) => (
                    <div key={entry.id} className="evidence-item">
                      <div className="mini-label">{entry.label}</div>
                      <div className="mt-1.5 break-words text-[12px] text-slate-200">{entry.value}</div>
                      <div className="mt-2 text-[10px] text-slate-500">Characters {entry.start}–{entry.end}{entry.confidence === null ? "" : " · P(verified extraction): " + asPercentage(entry.confidence)}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] leading-5 text-slate-500">{result.privacyNotice}</p>
              </DetailSection>

              <DetailSection label="02" title="Case linkage & intent" count={result.caseScope?.coherent ? "Coherent claims" : "Needs review"}>
                {result.caseScope ? (
                  <div className="space-y-3">
                    <div className="case-data-row"><span>Referenced orders</span><strong>{result.caseScope.orderRefs.join(", ") || "None identified"}</strong></div>
                    <div className="case-data-row"><span>Delivery dates in message</span><strong>{result.caseScope.deliveryDates.join(", ") || "Not identified"}</strong></div>
                    <div className="case-data-row"><span>Current intent</span><strong className="capitalize">{result.caseScope.intent.replace("-", " ")}</strong></div>
                    {result.caseScope.issueSignals.length > 0 && <div className="case-data-row"><span>Issue signals</span><strong>{result.caseScope.issueSignals.join(", ")}</strong></div>}
                    {result.caseScope.blockers.length > 0 && <ul className="space-y-2 border-t border-white/[.08] pt-3">{result.caseScope.blockers.map((b, i) => <li key={i} className="flex gap-2 text-[12px] leading-5 text-amber-200/90"><CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {b}</li>)}</ul>}
                    {!result.caseScope.blockers.length && <div className="text-[12px] leading-6 text-slate-400">No conflicting claims found by the current checks. External merchant verification is still required.</div>}
                  </div>
                ) : <p className="text-[12px] text-slate-400">No structured case-scope metadata supplied.</p>}
              </DetailSection>

              <DetailSection label="03" title="Typed assessments" count={result.mode === "demo" ? "Heuristics" : "Clocked Decide"}>
                <div className="space-y-5">
                  {result.assessments.length === 0 && <p className="text-[12px] text-slate-400">No model assessments. Guard may have blocked subsequent calls.</p>}
                  {result.assessments.map((a) => (
                    <div key={a.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] text-slate-300">{a.label}</span>
                        <span className="text-[12px] font-semibold text-slate-200">{a.answer === null ? "Unknown" : a.answer ? "Yes" : "No"}</span>
                      </div>
                      {a.probability !== null && <div className="probability-track mt-2"><div className="probability-fill" style={{ width: Math.min(100, Math.max(0, a.probability * 100)) + "%" }} /></div>}
                      <div className="mt-1.5 text-right text-[10px] text-slate-500">{result.mode === "demo" ? "Synthetic heuristic; no model call" : "P(Yes): " + asPercentage(a.probability)}</div>
                    </div>
                  ))}
                </div>
              </DetailSection>

              <DetailSection label="04" title="Policy & safety gates" count={pendingChecks.length ? pendingChecks.length + " need attention" : "All checks passed"}>
                <div className="space-y-4">
                  {result.checks.map((check) => (
                    <div key={check.label} className="flex items-start gap-3">
                      <StatusIcon status={check.status} />
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-slate-200">{check.label}</div>
                        <div className="mt-0.5 text-[11px] leading-5 text-slate-500">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-white/[.08] pt-4">
                  <div className="mini-label">Decision rationale</div>
                  <ul className="mt-3 space-y-2">{result.reasons.map((reason, i) => <li key={i} className="flex gap-2 text-[11px] leading-5 text-slate-400"><span className="text-cyan-400">•</span>{reason}</li>)}</ul>
                </div>
                <p className="mt-4 text-[11px] leading-5 text-slate-500">{result.policyNotice}</p>
              </DetailSection>
            </div>
          </section>
        )}

        <footer className="site-footer">
          <span>CLOCKED / RETURN LAB</span>
          <span>Illustrative 30-day policy · No executed refunds · Synthetic fixtures</span>
        </footer>
      </div>
    </main>
  );
}
