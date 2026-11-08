"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleHelp, Clock3, FileSearch, LockKeyhole, RotateCcw, ShieldAlert, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { createSamples } from "../lib/samples";
import type { EvidenceField, Lane, Mode, TriageResult } from "../lib/types";

const lanes: { id: Lane; title: string; subtitle: string; color: string }[] = [
  { id: "approve", title: "Approve", subtitle: "Recommended only", color: "green" },
  { id: "review", title: "Review", subtitle: "Human decision needed", color: "amber" },
  { id: "reject", title: "Decline", subtitle: "Outside demo policy", color: "rose" },
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
  return <p className="whitespace-pre-wrap break-words leading-8 text-[13px] text-slate-300">{nodes}</p>;
}
function StatusIcon({ status }: { status: "pass" | "fail" | "unknown" }) {
  return status === "pass"
    ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
    : status === "fail"
      ? <XCircle size={15} className="text-rose-400 shrink-0" />
      : <CircleHelp size={15} className="text-amber-400 shrink-0" />;
}
function LaneBoard({ selected }: { selected: Lane | null }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {lanes.map((lane, index) => (
        <div key={lane.id} className={"lane-card lane-" + lane.color + (selected === lane.id ? " lane-active" : "")}>
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[.19em] uppercase opacity-60">LANE 0{index + 1}</span><span className="status-dot" /></div>
          <div className="mt-6 text-[23px] font-semibold tracking-tight">{lane.title}</div>
          <div className="mt-1 text-[12px] opacity-60">{lane.subtitle}</div>
          <div className="mt-5 flex h-5 items-center text-[11px] font-semibold tracking-wide">{selected === lane.id ? "●  SELECTED ROUTE" : "AWAITING SIGNAL"}</div>
        </div>
      ))}
    </div>
  );
}
export default function Home() {
  const [mode, setMode] = useState<Mode>("demo");
  const [email, setEmail] = useState("");
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [asOf, setAsOf] = useState("");
  const samples = useMemo(() => asOf ? createSamples(asOf) : [], [asOf]);
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
  const [result, setResult] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestEpoch, setRequestEpoch] = useState(0);

  const summary = useMemo(() => {
    if (!result) return null;
    const label = result.lane === "approve" ? "Eligible under demo rules" : result.lane === "reject" ? "Outside the return window" : "Escalate to a human";
    const description = result.lane === "approve"
      ? "Source evidence passes every configured gate. No refund has been issued."
      : result.lane === "reject"
        ? "The reported delivery date exceeds the example policy window. Exceptions still need review."
        : "One or more conditions are unknown or require a human decision.";
    return { label, description };
  }, [result]);

  async function analyze() {
    setBusy(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message: email, mode, asOf }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const err = data as { error?: string };
        throw new Error(err.error ?? "Unable to analyze this request.");
      }
      setResult(data as TriageResult);
      setRequestEpoch((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setBusy(false);
    }
  }
  function chooseSample(id: string) {
    const sample = samples.find((s) => s.id === id);
    if (sample) { setEmail(sample.message); setActiveSample(id); setError(""); setResult(null); }
  }
  function reset() { setEmail(""); setActiveSample(null); setResult(null); setError(""); }
  return (
    <main className="min-h-screen bg-[#080e18] text-[#e7edf5]">
      <div className="absolute inset-x-0 top-0 h-[500px] pointer-events-none top-glow" />
      <div className="relative mx-auto max-w-[1470px] px-5 pb-24 pt-6 sm:px-9 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="brand-icon"><Clock3 size={22} strokeWidth={2.2} /></div>
            <div>
              <div className="text-[14px] font-extrabold tracking-[.14em]">CLOCKED <span className="font-medium text-slate-400">/ RETURN LAB</span></div>
              <div className="text-[11px] tracking-[.12em] text-slate-500">RETURNS & REFUND AUTOPILOT</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />No external actions</div>
            <div className="flex rounded-xl border border-white/10 bg-black/30 p-1" role="group" aria-label="Analysis mode">
              <button className={"mode-tab " + (mode === "demo" ? "mode-active" : "")} onClick={() => { setMode("demo"); setResult(null); }}>Demo fixtures</button>
              <button className={"mode-tab " + (mode === "live" ? "mode-active" : "")} onClick={() => { setMode("live"); setResult(null); }}>Clocked live</button>
            </div>
          </div>
        </header>

        <section className="pb-9 pt-11 lg:pb-12 lg:pt-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[.055] px-3 py-1.5 text-[11px] font-semibold tracking-widest text-cyan-200"><Sparkles size={12} /> INTELLIGENCE WITH EVIDENCE</div>
          <h1 className="max-w-[850px] text-4xl font-semibold tracking-[-.045em] leading-[1.1] sm:text-5xl lg:text-[64px]">Returns, routed with <span className="text-sky-300">reason.</span></h1>
          <p className="mt-5 max-w-[640px] text-[15px] leading-7 text-slate-400">Transform messy customer emails into an evidence-backed recommendation. Personal data protection, exact extraction, typed AI judgments and explicit policy gates.</p>
          <div className="mt-7 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
            <span className="pipeline-pill"><ShieldCheck size={13} /> 01 / PROTECT</span><span className="pipeline-arrow">→</span>
            <span className="pipeline-pill"><FileSearch size={13} /> 02 / EXTRACT</span><span className="pipeline-arrow">→</span>
            <span className="pipeline-pill"><Sparkles size={13} /> 03 / DECIDE</span><span className="pipeline-arrow">→</span>
            <span className="pipeline-pill"><LockKeyhole size={13} /> 04 / POLICY GATES</span>
          </div>
        </section>

        <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)]">
          <div className="surface overflow-hidden">
            <div className="section-heading"><div><div className="eyebrow">INPUT / 001</div><h2 className="section-title mt-1">Customer request</h2></div><div className="text-[11px] text-slate-500">TEXT MESSAGE</div></div>
            <div className="p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between"><label className="text-[12px] font-semibold text-slate-300" htmlFor="return-message">Incoming message</label><button className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-white" onClick={reset}><RotateCcw size={12} /> Clear</button></div>
              <textarea id="return-message" value={email} spellCheck={false} onChange={(e) => { setEmail(e.target.value); setActiveSample(null); setResult(null); }} placeholder="Paste a customer's return email here..." className="message-input h-64 w-full resize-y rounded-xl p-4 text-[13px] leading-6" />
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500"><span>{email.length.toLocaleString()} / 10,000 characters</span><span>Not saved to a database</span></div>
              <div className="mt-6"><div className="mb-3 text-[11px] font-bold tracking-[.12em] text-slate-500">TRY A SCENARIO</div>
                <div className="flex flex-wrap gap-2">{samples.map((sample) => <button key={sample.id} title={sample.tag} onClick={() => chooseSample(sample.id)} className={"sample-button " + (activeSample === sample.id ? "sample-active" : "")}>{sample.label}</button>)}</div>
              </div>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6">
                <div><label htmlFor="policy-date" className="block text-[11px] font-semibold text-slate-400">Evaluation date</label><input id="policy-date" type="date" value={asOf} onChange={(e) => { setAsOf(e.target.value); setResult(null); }} className="mt-1.5 rounded-lg border border-white/10 bg-[#0d1929] px-3 py-2 text-[12px] text-slate-200 [color-scheme:dark]" /></div>
                <button onClick={analyze} disabled={busy || email.trim().length < 20 || email.length > 10000 || !asOf} className="primary-button flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Analyzing request..." : mode === "live" ? "Run Clocked analysis" : "Run demo analysis"}<ArrowRight size={16} /></button>
              </div>
              {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-[12px] text-rose-200">{error}</p>}
              <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><ShieldAlert size={15} className="mt-0.5 shrink-0" />{mode === "live" ? "Live mode sends text to Clocked Protect for anonymization, then sends redacted text to the other Clocked services. Do not use real customer data without appropriate permissions." : "Demo mode uses local regex fixtures, not real Clocked AI or production-grade PII masking. Use synthetic messages only."}</p>
            </div>
          </div>

          <div className="surface overflow-hidden">
            <div className="section-heading"><div><div className="eyebrow">OUTPUT / 002</div><h2 className="section-title mt-1">Decision routing</h2></div>{result ? <span className="result-chip">{result.mode === "demo" ? "SIMULATED" : "CLOCKED LIVE"}</span> : <span className="text-[11px] text-slate-500">AWAITING ANALYSIS</span>}</div>
            <div className="p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] font-bold tracking-[.13em] text-slate-500">THREE-LANE ACTION BOARD</span><span className="text-[11px] text-slate-500">No automatic payouts</span></div>
              <LaneBoard selected={result?.lane ?? null} />
              {result && summary ? (
                <div key={requestEpoch} className="mt-5 rounded-xl border border-sky-400/20 bg-sky-400/[.055] p-5">
                  <div className="text-[10px] font-bold tracking-[.17em] text-sky-300">RECOMMENDATION / {result.requestId}</div>
                  <h3 className="mt-2 text-[21px] font-semibold tracking-tight">{summary.label}</h3>
                  <p className="mt-2 text-[12px] leading-6 text-slate-400">{summary.description}</p>
                  <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-slate-500">Evaluated {result.asOf} · {result.elapsedDays === null ? "Delivery age unknown" : result.elapsedDays + " days since delivery"}</div>
                </div>
              ) : (
                <div className="mt-5 flex min-h-[165px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/10 p-6 text-center"><FileSearch size={26} className="text-slate-600" /><div className="mt-3 text-[13px] font-semibold text-slate-300">Evidence before action</div><p className="mt-1 text-[12px] text-slate-500">Submit a request to see a policy-backed route.</p></div>
              )}
              <div className="mt-5 rounded-lg border border-white/[.07] bg-white/[.025] p-4 text-[11px] leading-5 text-slate-500"><strong className="text-slate-300">Important:</strong> Approve and decline are recommendations, not executed actions. Missing evidence and legal or product defects are escalated. This demo does not connect to Shopify, email, or any payment provider.</div>
            </div>
          </div>
        </section>

        {result && <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)]">
          <div className="surface overflow-hidden">
            <div className="section-heading"><div><div className="eyebrow">EVIDENCE / 003</div><h2 className="section-title mt-1">Source-linked extraction</h2></div><span className="text-[11px] text-slate-500">{result.evidence.length} verified spans</span></div>
            <div className="p-5 sm:p-6">
              <div className="rounded-xl border border-white/[.08] bg-[#0b1726] p-4"><EvidenceText text={result.redactedText} evidence={result.evidence} /></div>
              <div className="mt-3 text-[11px] text-slate-500">Highlighted text matches exact character positions in the protected input. Unverified offsets are discarded.</div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">{result.evidence.map((e) => <div key={e.id} className="rounded-lg border border-white/[.075] bg-white/[.025] p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{e.label}</div><div className="mt-1.5 break-words text-[12px] text-slate-200">{e.value}</div><div className="mt-2 text-[10px] text-cyan-300/70">Characters {e.start}–{e.end} {e.confidence !== null ? "· " + asPercentage(e.confidence) + " confidence" : ""}</div></div>)}</div>
              <p className="mt-5 text-[11px] leading-5 text-slate-500">{result.privacyNotice}</p>
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="surface overflow-hidden">
              <div className="section-heading"><div><div className="eyebrow">MODEL / 004</div><h2 className="section-title mt-1">Typed assessments</h2></div></div>
              <div className="space-y-4 p-5 sm:p-6">{result.assessments.map((a) => <div key={a.id}>
                <div className="flex items-center justify-between gap-3"><span className="text-[12px] text-slate-300">{a.label}</span><span className="text-[11px] font-semibold text-slate-200">{a.answer === null ? "Unknown" : a.answer ? "Yes" : "No"}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: a.probability === null ? "0%" : (a.probability * 100).toFixed(1) + "%" }} /></div>
                <div className="mt-1.5 text-right text-[10px] text-slate-500">{result.mode === "demo" ? "No model call · demo heuristic" : "P(Yes): " + asPercentage(a.probability)}</div>
              </div>)}</div>
            </div>
            <div className="surface overflow-hidden">
              <div className="section-heading"><div><div className="eyebrow">RULE ENGINE / 005</div><h2 className="section-title mt-1">Policy checks</h2></div></div>
              <div className="p-5 sm:p-6"><div className="space-y-4">{result.checks.map((c) => <div key={c.label} className="flex items-start gap-3"><StatusIcon status={c.status} /><div><div className="text-[12px] font-semibold text-slate-200">{c.label}</div><div className="mt-1 text-[11px] leading-5 text-slate-500">{c.detail}</div></div></div>)}</div>
                <div className="mt-5 border-t border-white/10 pt-4"><div className="text-[11px] font-bold tracking-wider text-slate-400">WHY THIS ROUTE?</div><ul className="mt-2 space-y-2">{result.reasons.map((reason, i) => <li key={i} className="text-[11px] leading-5 text-slate-400">• {reason}</li>)}</ul></div>
              </div>
            </div>
          </div>
        </section>}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] leading-5 text-slate-500"><span>RETURN LAB · EVIDENCE-LED REFUND TRIAGE</span><span>30-day example policy · No payments or outbound email · Privacy-first workflow</span></footer>
      </div>
    </main>
  );
}
