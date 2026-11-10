"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, CircleAlert, CircleHelp,
  FileSearch, RotateCcw, ShieldCheck, Sparkles, XCircle,
} from "lucide-react";
import { createSamples } from "../../lib/samples";
import type { EvidenceField, TriageResult } from "../../lib/types";

type Step = 0 | 1 | 2;

const headlines = ["Clear return", "Defective item", "Outside window"] as const;

const intros = [
  "An unused item inside the example window with an explicit refund request. Watch which checks pass and which words the engine used.",
  "A defect reported after two days, with no delivery date. Watch the case leave the automatic lane and go to a person.",
  "A clean request that arrives after the example window has closed. Watch the date decide the recommendation.",
] as const;

function asOfToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function HighlightedText({ text, evidence }: { text: string; evidence: EvidenceField[] }) {
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
  return <p className="tour-source-text">{nodes}</p>;
}

function StatusIcon({ status }: { status: "pass" | "fail" | "unknown" }) {
  return status === "pass"
    ? <CheckCircle2 size={15} className="tour-ok" aria-label="Passed" />
    : status === "fail"
      ? <XCircle size={15} className="tour-bad" aria-label="Failed" />
      : <CircleHelp size={15} className="tour-warn" aria-label="Needs review" />;
}

export default function TourPage() {
  const [asOf, setAsOf] = useState("");
  const [step, setStep] = useState<Step>(0);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visited, setVisited] = useState<number[]>([]);
  const [showChecks, setShowChecks] = useState(false);
  const samples = useMemo(() => (asOf ? createSamples(asOf) : []), [asOf]);
  const sequence = useRef(0);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAsOf(asOfToday()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const sample = samples[step];

  const runCase = useCallback(async (index: Step, date: string, list: ReturnType<typeof createSamples>) => {
    const target = list[index];
    if (!target) return;
    const requestNumber = ++sequence.current;
    setBusy(true);
    setError("");
    setResult(null);
    setShowChecks(false);
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message: target.message, mode: "demo", asOf: date }),
      });
      const data: unknown = await response.json();
      if (sequence.current !== requestNumber) return;
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "The demo engine could not evaluate this case.");
      setResult(data as TriageResult);
      setVisited((current) => (current.includes(index) ? current : [...current, index]));
      // On wide screens both panels are already in view. Only pull the verdict
      // into view where it sits below the request panel.
      if (window.matchMedia("(max-width: 1023px)").matches) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" }));
      }
    } catch (caught) {
      if (sequence.current !== requestNumber) return;
      setError(caught instanceof Error ? caught.message : "An unexpected error occurred.");
    } finally {
      if (sequence.current === requestNumber) setBusy(false);
    }
  }, []);

  function select(index: Step) {
    if (busy) return;
    sequence.current++;
    setStep(index);
    setResult(null);
    setError("");
    setShowChecks(false);
  }

  function run(index: Step = step) {
    if (!asOf) return;
    void runCase(index, asOf, samples);
  }

  function restart() {
    sequence.current++;
    setVisited([]);
    setResult(null);
    setError("");
    setStep(0);
    setShowChecks(false);
  }

  const next = step < 2 ? ((step + 1) as Step) : null;

  return (
    <div className="tour-page">
      <header className="tour-nav">
        <Link className="tour-brand" href="/">
          <span className="tour-brand-mark" aria-hidden="true" />
          <span>Clocked Return Lab</span>
        </Link>
        <nav className="tour-nav-links" aria-label="Tour">
          <Link href="/">Home</Link>
          <Link href="/lab">Open the workspace</Link>
          <a href="https://github.com/Cho3en/Clocked-Return-Lab" target="_blank" rel="noopener noreferrer">Source</a>
        </nav>
      </header>

      <main className="tour-main">
        <div className="tour-head">
          <div className="tour-head-copy">
            <span className="tour-kicker">Judge tour</span>
            <h1 className="tour-title">Three cases, one real engine</h1>
            <p className="tour-lede">
              Each step sends a sample request to the same demo engine the workspace uses. Verdicts, checks and highlighted
              words come from that run. No account, no key, and no refund is ever issued.
            </p>
          </div>
          <div className="tour-progress-block">
            <span className="tour-progress-label">{visited.length} of 3 cases reviewed</span>
            <ol className="tour-progress" aria-label="Tour progress">
              {samples.map((entry, index) => (
                <li key={entry.id} className={visited.includes(index) ? "is-done" : index === step ? "is-current" : ""}>
                  <span className="tour-progress-dot" aria-hidden="true">{visited.includes(index) ? <CheckCircle2 size={12} /> : index + 1}</span>
                  <span className="tour-progress-name">{headlines[index]}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="tour-cases" role="tablist" aria-label="Cases">
          {samples.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={step === index}
              className={"tour-case" + (step === index ? " is-active" : "") + (visited.includes(index) ? " is-done" : "")}
              onClick={() => select(index as Step)}
              disabled={busy}
            >
              <span className="tour-case-num">{index + 1}</span>
              <span className="tour-case-body">
                <span className="tour-case-name">{entry.label}</span>
                <span className="tour-case-tag">{entry.tag.replace("Expected: ", "Example: ")}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="tour-stage">
          <section className="tour-panel" aria-labelledby="tour-request-title">
            <div className="tour-panel-head">
              <h2 id="tour-request-title">Case {step + 1}: {headlines[step]}</h2>
              <span className="tour-panel-meta">Sample request</span>
            </div>
            <p className="tour-intro">{intros[step]}</p>
            <pre className="tour-request">{sample?.message ?? "Loading the sample request."}</pre>
            <div className="tour-actions">
              <button type="button" className="tour-run" onClick={() => run()} disabled={!asOf || busy}>
                <Sparkles size={15} aria-hidden="true" />
                <span>{busy ? "Running the engine" : result ? "Run this case again" : "Run this case"}</span>
              </button>
              {next !== null && (
                <button type="button" className="tour-secondary" onClick={() => select(next)} disabled={busy}>
                  Next case<ArrowRight size={15} aria-hidden="true" />
                </button>
              )}
              <button type="button" className="tour-quiet" onClick={restart} disabled={busy}>
                <RotateCcw size={14} aria-hidden="true" /> Start over
              </button>
            </div>
            <p className="tour-note-line">
              <ShieldCheck size={14} aria-hidden="true" /> Evaluated on {asOf || "today"} against the example 30 day policy. Sample data only.
            </p>
            {error && <p className="error-box" role="alert">{error}</p>}
          </section>

          <section className="tour-panel tour-verdict-panel" aria-labelledby="tour-verdict-title" ref={resultRef}>
            <div className="tour-panel-head">
              <h2 id="tour-verdict-title">Decision</h2>
              <span className="tour-panel-meta">{result ? result.requestId : "Waiting"}</span>
            </div>

            {!result && !busy && (
              <div className="tour-empty">
                <FileSearch size={22} aria-hidden="true" />
                <strong>Nothing checked yet</strong>
                <p>Press Run this case to evaluate the sample request with the demo engine.</p>
              </div>
            )}
            {busy && <div className="tour-empty"><Sparkles size={22} aria-hidden="true" /><strong>Checking the request</strong><p>Reading details, dates, condition and policy boundaries.</p></div>}

            {result && (
              <>
                <div className={"tour-verdict tour-verdict-" + result.lane}>
                  <span className="tour-verdict-kicker">
                    {result.lane === "approve" ? <CheckCircle2 size={15} aria-hidden="true" /> : result.lane === "review" ? <CircleAlert size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
                    Recommendation
                  </span>
                  <div className="tour-verdict-word">{result.lane === "approve" ? "Approve" : result.lane === "review" ? "Human review" : "Decline"}</div>
                  <p className="tour-verdict-copy">
                    {result.lane === "approve"
                      ? "The request fits the example return rules. An agent still confirms the order before acting, and nothing is refunded."
                      : result.lane === "review"
                        ? "A person needs to check this case. The details below show what is missing or unclear."
                        : "The reported delivery date is outside the example window. An agent still checks customer rights before replying."}
                  </p>
                </div>

                <div className="tour-facts">
                  <div><span>Claimed order</span><strong>{result.caseScope?.linkedOrderId ?? "Unresolved"}</strong></div>
                  <div><span>Delivery age</span><strong>{result.elapsedDays === null ? "Unknown" : result.elapsedDays + " days"}</strong></div>
                  <div><span>Checks needing attention</span><strong>{result.checks.filter((check) => check.status !== "pass").length}</strong></div>
                </div>

                <div className="tour-evidence">
                  <div className="tour-evidence-head">
                    <h3>Evidence in the message</h3>
                    <span>{result.evidence.length} exact spans</span>
                  </div>
                  <div className="tour-source">
                    <HighlightedText text={result.redactedText} evidence={result.evidence} />
                  </div>
                  <ul className="tour-fields">
                    {result.evidence.map((field) => (
                      <li key={field.id}>
                        <span>{field.label}</span>
                        <strong>{field.value}</strong>
                        <em>Characters {field.start} to {field.end}</em>
                      </li>
                    ))}
                  </ul>
                </div>

                <details className="tour-checks" open={showChecks} onToggle={(event) => setShowChecks((event.currentTarget as HTMLDetailsElement).open)}>
                  <summary>
                    <span>All {result.checks.length} checks</span>
                    <ChevronDown size={15} aria-hidden="true" />
                  </summary>
                  <ul>
                    {result.checks.map((check) => (
                      <li key={check.label}>
                        <StatusIcon status={check.status} />
                        <span>
                          <strong>{check.label}</strong>
                          <em>{check.detail}</em>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>

                <p className="tour-foot">
                  This result is based on what the customer wrote. No store record was checked, and nothing was sent or refunded.
                </p>
              </>
            )}
          </section>
        </div>

        <div className="tour-next-row">
          {next !== null ? (
            <button type="button" className="tour-run tour-run-wide" onClick={() => select(next)} disabled={busy}>
              Continue to case {next + 1}: {headlines[next]}<ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <Link className="tour-run tour-run-wide" href="/lab">
              Open the full workspace<ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <Link className="tour-back" href="/">
            <ArrowLeft size={14} aria-hidden="true" /> Back to the overview
          </Link>
        </div>
      </main>
    </div>
  );
}
