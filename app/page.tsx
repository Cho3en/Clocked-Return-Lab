"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight, BarChart3, CheckCircle2, ChevronDown, CircleAlert, CircleHelp,
  ExternalLink, FileSearch, FileText, Fingerprint, House, Inbox, Layers, LockKeyhole, Package,
  PieChart, Play, Plus, RotateCcw, ShieldAlert, ShieldCheck,
  Sparkles, TrendingUp, Users, XCircle, Zap,
} from "lucide-react";
import { createSamples, type SampleId } from "../lib/samples";
import type { EvidenceField, Lane, Mode, TriageResult } from "../lib/types";

const SOURCE_URL = "https://github.com/Cho3en/Clocked-Return-Lab";
const VIDEO_URL = "https://github.com/Cho3en/Clocked-Return-Lab/releases/tag/demo-v7";

const lanes: { id: Lane; title: string; subtitle: string }[] = [
  { id: "approve", title: "Approve", subtitle: "Suggestion only" },
  { id: "review", title: "Review", subtitle: "Needs a person" },
  { id: "reject", title: "Decline", subtitle: "Example policy" },
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
  return <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.75, color: "var(--ink)" }}>{nodes}</p>;
}

function StatusIcon({ status }: { status: "pass" | "fail" | "unknown" }) {
  return status === "pass"
    ? <CheckCircle2 size={17} style={{ color: "var(--green)", flexShrink: 0 }} aria-label="Passed" />
    : status === "fail"
      ? <XCircle size={17} style={{ color: "var(--red)", flexShrink: 0 }} aria-label="Failed" />
      : <CircleHelp size={17} style={{ color: "var(--amber)", flexShrink: 0 }} aria-label="Needs review" />;
}

function DetailSection({ label, title, count, children }: { label: string; title: string; count?: string; children: ReactNode }) {
  return (
    <details className="detail-panel">
      <summary className="detail-toggle">
        <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <span className="detail-num">{label}</span>
          <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ink)" }}>{title}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {count && <span className="detail-count">{count}</span>}
          <ChevronDown size={16} className="detail-chevron" aria-hidden="true" />
        </span>
      </summary>
      <div className="detail-content">{children}</div>
    </details>
  );
}

const pipelineStages = [
  { id: "request", name: "Request", sub: "Customer message" },
  { id: "protect", name: "Protect", sub: "Privacy masking" },
  { id: "guard", name: "Guard", sub: "Safety screening" },
  { id: "extract", name: "Extract", sub: "Evidence fields" },
  { id: "decide", name: "Decide", sub: "Typed assessment" },
];

const demoPipelineStages = [
  { id: "request", name: "Request", sub: "Customer message" },
  { id: "local", name: "Evaluate", sub: "Local policy checks" },
  { id: "recommend", name: "Recommend", sub: "Advisory outcome" },
];

// Plain-language takeaways shown after each tour case. Each one restates what the
// demo engine actually returned for that sample.
const tourNotes: Record<SampleId, string> = {
  eligible: "Delivered 12 days ago, unused and unopened, refund requested. Every check passes, so the example 30 day window recommends Approve. No refund is issued.",
  exception: "The item stopped working after two days and the delivery date is missing. A product problem plus missing details sends this to a person, so the app recommends Human Review.",
  expired: "Delivered 58 days ago, which is outside the example 30 day window. The app recommends Decline and still asks the agent to check customer rights before replying.",
};

type TourState = { index: number; status: "running" | "done" };

export default function Home() {
  const [mode, setMode] = useState<Mode>("demo");
  const [email, setEmail] = useState("");
  const [inputReady, setInputReady] = useState(false);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [asOf, setAsOf] = useState("");
  const samples = useMemo(() => asOf ? createSamples(asOf) : [], [asOf]);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestEpoch, setRequestEpoch] = useState(0);
  const [accessToken, setAccessToken] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  // Counts only successful evaluations from this browser tab; no messages or customer data are stored.
  const [sessionCounts, setSessionCounts] = useState<Record<Lane, number>>({ approve: 0, review: 0, reject: 0 });
  const [tour, setTour] = useState<TourState | null>(null);
  const [tourDone, setTourDone] = useState<number[]>([]);
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const evidenceRef = useRef<HTMLElement | null>(null);
  // Set only by a successful tour run, so a manual run never opens panels by itself.
  const openEvidenceOnResult = useRef(false);
  const jumpToWorkspaceOnResult = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const date = dayToday();
      const first = createSamples(date)[0];
      setAsOf(date);
      setEmail(first.message);
      setActiveSample(first.id);
      setInputReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => () => { pending.current?.abort(); }, []);
  useEffect(() => {
    if (!result || !outputRef.current) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      outputRef.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestEpoch, result]);
  // Bring a failure into view on desktop too, so a blocked live request or a
  // server error cannot be missed below the fold.
  useEffect(() => {
    if (!error || !errorRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      errorRef.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error]);
  useEffect(() => {
    if (!result) return;
    const frame = window.requestAnimationFrame(() => {
      if (openEvidenceOnResult.current) {
        openEvidenceOnResult.current = false;
        const first = evidenceRef.current?.querySelector("details");
        if (first instanceof HTMLDetailsElement) first.open = true;
      }
      if (jumpToWorkspaceOnResult.current) {
        jumpToWorkspaceOnResult.current = false;
        if (!window.matchMedia("(min-width: 1024px)").matches) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById("case-workspace")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [result]);

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
      ? "Based on the customer's message, this fits the example return rules. No refund has been issued."
      : result.lane === "reject"
        ? "The reported delivery date is outside the sample return window. Nothing has been declined in an actual store."
        : "Some details are missing, conflicting or need a person to review them.";
    const nextAction = result.lane === "approve"
      ? "Check the actual order, delivery and store rules before taking action."
      : result.lane === "reject"
        ? "Check the store rules, order history and customer rights before replying."
        : "Have a support agent check the issues listed below.";
    return { label, description, nextAction };
  }, [result]);

  async function analyze(messageOverride?: string, modeOverride?: Mode, options?: { openEvidence?: boolean; scrollToWorkspace?: boolean }) {
    const outgoingMessage = messageOverride ?? email;
    const runMode = modeOverride ?? mode;
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
        headers: { "Content-Type": "application/json", ...(runMode === "live" ? { "x-returnlab-token": accessToken } : {}) },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ message: outgoingMessage, mode: runMode, asOf }),
      });
      const data: unknown = await response.json();
      if (controller.signal.aborted || sequence.current !== requestNumber) return;
      if (!response.ok) {
        const err = data as { error?: string };
        throw new Error(err.error ?? "Unable to analyze this request.");
      }
      const completed = data as TriageResult;
      openEvidenceOnResult.current = Boolean(options?.openEvidence);
      jumpToWorkspaceOnResult.current = Boolean(options?.scrollToWorkspace);
      setResult(completed);
      if (completed.lane === "approve" || completed.lane === "review" || completed.lane === "reject") {
        setSessionCounts((prev) => ({ ...prev, [completed.lane]: prev[completed.lane] + 1 }));
      }
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
    if (sample) { invalidate(); setTour(null); setEmail(sample.message); setActiveSample(id); }
  }
  function reset() { invalidate(); setTour(null); setTourDone([]); setEmail(""); setActiveSample(null); }

  function runTourStep(index: number) {
    const sample = samples[index];
    if (!sample) return;
    invalidate();
    setMode("demo");
    setActiveSample(sample.id);
    setEmail(sample.message);
    setActiveSection("cases");
    setTour({ index, status: "running" });
    void analyze(sample.message, "demo", { openEvidence: true, scrollToWorkspace: true }).then(() => {
      setTour((current) => (current && current.index === index && current.status === "running" ? { index, status: "done" } : current));
      setTourDone((current) => (current.includes(index) ? current : [...current, index].sort((a, b) => a - b)));
    });
  }

  function startTour() {
    setTourDone([]);
    runTourStep(0);
  }

  const pendingChecks = result?.checks.filter((c) => c.status !== "pass") ?? [];
  const visibleReason = result?.reasons.find((reason) => /review|missing|uncertain|multiple|conflict|issue|ambig|right|date|order|product|intent/i.test(reason))
    ?? result?.reasons[0];

  function stageState(id: string): "done" | "active" | "ready" | "pending" | "attention" | "skipped" {
    if (id === "request") return busy || result ? "done" : "ready";
    if ((result?.mode ?? mode) === "demo") {
      if (result) return "done";
      return busy && id === "local" ? "active" : "pending";
    }
    // Clocked does not report intermediate stage progress. Never animate invented stages.
    if (!result) return "pending";
    // A successful live response means Protect produced a usable redacted message.
    if (id === "protect") return "done";
    const guard = result.checks.find((check) => check.label === "Prompt-injection screening");
    if (id === "guard") return guard?.status === "pass" ? "done" : "attention";
    // The server returns early on a Guard block, before Extract and Decide.
    return guard?.status === "pass" ? "done" : "skipped";
  }

  const sessionTotal = sessionCounts.approve + sessionCounts.review + sessionCounts.reject;
  const tourCase = tour ? samples[tour.index] : undefined;
  const tourNote = !tour
    ? "Start the tour to run all three cases. Each case uses the same demo engine as the workspace below."
    : tour.status === "running"
      ? "Running " + (tourCase?.label ?? "this case") + " through the demo engine."
      : (tourCase ? tourNotes[tourCase.id] : "");

  const detailLane = result ? lanes.find((l) => l.id === result.lane) : null;
  const metrics = [
    { icon: <Package size={16} aria-hidden="true" />, label: "Cases evaluated", value: String(sessionTotal), note: "Since you opened this tab", tint: "m-peach" },
    { icon: <Users size={16} aria-hidden="true" />, label: "Human review", value: String(sessionCounts.review), note: "Requests sent for review", tint: "m-lav" },
    { icon: <CheckCircle2 size={16} aria-hidden="true" />, label: "Approve (recommended)", value: String(sessionCounts.approve), note: "No refunds executed", tint: "m-sage" },
    { icon: <XCircle size={16} aria-hidden="true" />, label: "Decline (recommended)", value: String(sessionCounts.reject), note: "Based on the demo policy", tint: "m-rose" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <div className="brand-mark"><Package size={20} aria-hidden="true" /></div>
          <div>
            <div className="brand-name">Clocked Return Lab</div>
            <div className="brand-sub">Return request review</div>
          </div>
        </div>
        <nav className="side-nav">
          {[
            { id: "tour", label: "Tour", icon: <Sparkles size={17} aria-hidden="true" />, href: "#judge-tour" },
            { id: "overview", label: "Overview", icon: <House size={17} aria-hidden="true" />, href: "#overview" },
            { id: "cases", label: "Cases", icon: <Layers size={17} aria-hidden="true" />, href: "#case-workspace" },
            { id: "new-case", label: "New Case", icon: <Plus size={17} aria-hidden="true" />, href: "#return-message" },
            { id: "analytics", label: "Analytics", icon: <BarChart3 size={17} aria-hidden="true" />, href: "#analytics" },
            { id: "evidence", label: "Evidence", icon: <ShieldCheck size={17} aria-hidden="true" />, href: "#evidence-details" },
          ].map((link) => (
            <a key={link.id} className={"side-link" + (activeSection === link.id ? " active" : "")}
              href={link.href} onClick={() => setActiveSection(link.id)}
              aria-current={activeSection === link.id ? "location" : undefined}>
              {link.icon} {link.label}
              {link.id === "cases" && result && <span className="side-badge">1</span>}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <strong>Powered by</strong>
            <b>Clocked</b>
            <span>Protect · Guard · Extract · Decide</span>
          </div>
        </div>
        <div className="side-tools">
          <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer"><Play size={13} aria-hidden="true" /> Watch demo</a>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} aria-hidden="true" /> Source</a>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <span className="topbar-title">Return review</span>
            <p className="topbar-sub">Tour the three sample cases, then test your own message</p>
          </div>
          <div className="top-actions">
            <span className="status-chip"><span className="status-dot" aria-hidden="true" /> No refunds executed</span>
            <div className="mode-toggle" role="group" aria-label="Analysis mode">
              <button type="button" aria-pressed={mode === "demo"} className={"mode-btn " + (mode === "demo" ? "active" : "")} onClick={() => { invalidate(); setMode("demo"); }}>Demo fixtures</button>
              <button type="button" aria-pressed={mode === "live"} className={"mode-btn " + (mode === "live" ? "active" : "")} onClick={() => { invalidate(); setMode("live"); }}>Clocked live</button>
            </div>
          </div>
        </header>

        <main className="content" id="overview">
          <section className="story-hero" id="story-hero" aria-labelledby="story-hero-title">
            <div className="hero-art" aria-hidden="true">
              <span className="hero-sun" />
              <span className="hero-ridge" />
            </div>
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="hero-eyebrow"><span className="hero-dot" aria-hidden="true" />Return review with evidence</span>
                <h1 id="story-hero-title" className="hero-title">Return requests deserve a decision you can defend.</h1>
                <p className="hero-lede">Clocked Return Lab reads the customer&apos;s message, tests it against the example return window and safety rules, and recommends Approve, Human Review, or Decline. Every result names the words behind it, and nothing is ever refunded.</p>
                <div className="hero-actions">
                  <button type="button" className="hero-cta" onClick={startTour} disabled={!inputReady || busy}>
                    <span>{tour ? "Run the tour again" : "Try the demo"}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                  <a className="hero-cta hero-cta-quiet" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={15} aria-hidden="true" /> View source
                  </a>
                  <a className="hero-link" href={VIDEO_URL} target="_blank" rel="noopener noreferrer">
                    <Play size={13} aria-hidden="true" /> Watch the one minute walkthrough
                  </a>
                </div>
                <div className="hero-proof">
                  <span>A person makes the call</span>
                  <span>No API key required</span>
                  <span>Sample data only</span>
                </div>
              </div>
              <figure className="hero-preview">
                <figcaption className="preview-head">
                  <span className="preview-tag">Example result</span>
                  <span className="preview-case">Clear return</span>
                </figcaption>
                <div className="preview-stamp">
                  <span className="preview-word">Approve</span>
                  <span className="preview-note">Inside the example window</span>
                </div>
                <p className="preview-source">
                  The item is <mark>unused and unopened</mark> in its original packaging. I would like to return it for a refund.
                </p>
                <ul className="preview-checks">
                  <li><CheckCircle2 size={14} aria-hidden="true" />Delivery date inside the example window</li>
                  <li><CheckCircle2 size={14} aria-hidden="true" />Item condition stated and uncontradicted</li>
                  <li><CheckCircle2 size={14} aria-hidden="true" />Refund request current and explicit</li>
                </ul>
                <p className="preview-foot">Generated by the demo engine for the first tour case. No refund is issued.</p>
              </figure>
            </div>
          </section>

          <section className="judge-tour" id="judge-tour" aria-labelledby="judge-tour-title">
            <div className="tour-head">
              <div>
                <div className="section-eyebrow">Judge tour</div>
                <h2 id="judge-tour-title" className="section-title">Three cases, one click each</h2>
                <p className="section-sub">Pick a case or run the whole tour. Each step loads a sample request, sends it to the same demo engine the workspace uses, and opens the evidence behind the result.</p>  {tourDone.length > 0 && (
                  <p className="tour-progress">{tourDone.length === samples.length ? "All three cases reviewed" : tourDone.length + " of " + samples.length + " cases reviewed"}</p>
                )}
              </div>
              <div className="tour-actions">
                <button type="button" className="tour-run" onClick={startTour} disabled={!inputReady || busy}>
                  <Sparkles size={15} aria-hidden="true" />
                  <span>{tour ? "Run the tour again" : "Start the tour"}</span>
                </button>
                {tour && (
                  <button type="button" className="tour-next" onClick={() => runTourStep((tour.index + 1) % Math.max(samples.length, 1))} disabled={busy}>
                    Next case<ArrowRight size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <ol className="tour-strip">
              {samples.map((sample, index) => {
                const state = tour?.index === index ? tour.status : null;
                const reviewed = tourDone.includes(index);
                return (
                  <li key={sample.id} className={"tour-step" + (reviewed ? " done" : "") + (state === "running" ? " running" : "")}>
                    <button type="button" onClick={() => runTourStep(index)} disabled={!inputReady || busy}>
                      <span className="tour-step-num">{index + 1}</span>
                      <span className="tour-step-body">
                        <span className="tour-step-name">{sample.label}</span>
                        <span className="tour-step-tag">{sample.tag.replace("Expected: ", "Example result: ")}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="tour-explain" role="status" aria-live="polite">
              <div className="tour-explain-head">
                <span className="tour-explain-step">{tour ? "Case " + (tour.index + 1) + " of " + samples.length : "Ready when you are"}</span>
                <span className="tour-explain-name">{tourCase ? tourCase.label : "One engine, three outcomes"}</span>
              </div>
              <p className="tour-explain-copy">{tourNote}</p>
              {tour?.status === "done" && (
                <div className="tour-explain-actions">
                  <a className="tour-link" href="#evidence-details">Open the full result</a>
                  <a className="tour-link" href="#return-message">Edit this message</a>
                </div>
              )}
            </div>
          </section>

          <section className="how-it-works" id="how-it-works" aria-labelledby="how-it-works-title">
            <div className="section-eyebrow">How it works</div>
            <h2 id="how-it-works-title" className="section-title">Four Clocked services, then your own rules</h2>            <p className="section-sub">The live path masks personal data, screens the message, extracts details with their positions in the text, and asks targeted questions. The app decides last, and it only recommends.</p>
            <div className="stage-grid">
              <div className="stage-card">
                <span className="stage-icon"><LockKeyhole size={17} aria-hidden="true" /></span>
                <div className="stage-name">Protect</div>
                <p className="stage-copy">Masks email addresses, phone numbers, and card numbers before anything else reads the request.</p>
              </div>
              <div className="stage-card">
                <span className="stage-icon"><ShieldAlert size={17} aria-hidden="true" /></span>
                <div className="stage-name">Guard</div>
                <p className="stage-copy">Stops the run when a message looks like a prompt injection attempt, and abstains when it is unsure.</p>
              </div>
              <div className="stage-card">
                <span className="stage-icon"><FileSearch size={17} aria-hidden="true" /></span>
                <div className="stage-name">Extract</div>
                <p className="stage-copy">Returns the order number, delivery date, condition, and request with the exact character positions behind each value.</p>
              </div>
              <div className="stage-card">
                <span className="stage-icon"><Sparkles size={17} aria-hidden="true" /></span>
                <div className="stage-name">Decide</div>
                <p className="stage-copy">Answers focused questions about refund intent, unused condition, and reported defects or damage.</p>
              </div>
            </div>
            <div className="truth-grid">
              <div className="truth-col truth-here">
                <span className="truth-flag">Runs on this page</span>
                <div className="truth-title">The public demo</div>
                <ul className="truth-list">
                  <li>Local rule engine. The demo path makes no network calls to Clocked.</li>
                  <li>Deterministic results. The same message always returns the same recommendation.</li>
                  <li>Sample customers only, and messages are not stored.</li>
                </ul>
              </div>
              <div className="truth-col">
                <span className="truth-flag">Implemented for live use</span>
                <div className="truth-title">The Clocked path</div>
                <ul className="truth-list">
                  <li>Protect masks personal data, Guard screens for injection, Extract returns positions, Decide answers focused questions.</li>
                  <li>Needs a server token plus four operator attestations before it will spend credits.</li>
                  <li>Disabled on this deployment. Live requests return HTTP 503 before any provider call.</li>
                </ul>
              </div>
            </div>
            <p className="how-note"><ShieldCheck size={15} aria-hidden="true" /><span>This public demo runs the local rule path. Clocked live stays disabled on this deployment, so the demo makes no paid calls.</span></p>
          </section>

          <section className="metrics" aria-label="Session metrics">
            {metrics.map((m) => (
              <div key={m.label} className={"metric " + m.tint}>
                <div className="metric-head">
                  <span className="metric-icon">{m.icon}</span>
                  <span className="metric-label">{m.label}</span>
                </div>
                <div className="metric-value num">{m.value}</div>
                <div className="metric-note">{m.note}</div>
              </div>
            ))}
          </section>

          <section className="analytics" aria-label="Analytics" id="analytics">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title"><TrendingUp size={17} aria-hidden="true" /> This session</div>
                  <div className="panel-sub">Requests checked since you opened this tab</div>
                </div>
              </div>
              <div className="empty-state" role="status">
                <b>{sessionTotal === 0 ? "No requests checked yet" : sessionTotal + (sessionTotal === 1 ? " request checked" : " requests checked")}</b>
                <span style={{ marginTop: 4, maxWidth: 340 }}>
                  {sessionTotal === 0 ? "Try a sample request below. Results are not saved." : "These numbers only cover this tab. They disappear when you close it."}
                </span>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title"><PieChart size={17} aria-hidden="true" /> Recommendations</div>
                  <div className="panel-sub">Results from this tab</div>
                </div>
              </div>
              {sessionTotal ? (
                <div className="session-bars" aria-label="Decision distribution in this browser tab">
                  {lanes.map((lane) => (
                    <div className="session-bar-row" key={lane.id}>
                      <span>{lane.title}</span>
                      <div className="session-track"><div className={"session-fill session-" + lane.id}
                        style={{ width: (100 * sessionCounts[lane.id] / sessionTotal) + "%" }} /></div>
                      <strong className="num">{sessionCounts[lane.id]}</strong>
                    </div>
                  ))}
                  <p className="session-disclaimer">Only requests checked in this tab are counted here.</p>
                </div>
              ) : (
                <div className="empty-state" role="status">
                  <b>No results to show yet</b>
                  <span style={{ marginTop: 4, maxWidth: 340 }}>Check a request to see a breakdown of the results.</span>
                </div>
              )}
            </div>
          </section>

          <div className="workspace" id="case-workspace">
            <section className="card" aria-labelledby="input-heading">
              <div className="card-head">
                <div>
                  <div className="card-eyebrow">01 / Input</div>
                  <h2 id="input-heading" className="card-title">Customer request</h2>
                </div>
                <span className="header-meta">{mode === "demo" ? "Sample data" : "Private live"}</span>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <label htmlFor="return-message" className="field-label">Incoming message</label>
                  <button type="button" onClick={reset} disabled={!inputReady} className="subtle-action"><RotateCcw size={14} aria-hidden="true" /> Clear</button>
                </div>
                <textarea
                  id="return-message"
                  value={email}
                  disabled={!inputReady}
                  spellCheck={false}
                  onChange={(e) => { invalidate(); setEmail(e.target.value); setActiveSample(null); }}
                  placeholder="Paste a made-up return email to try the demo..."
                  className="message-input"
                  style={{ marginTop: 10, minHeight: 170, resize: "vertical", padding: "12px 14px", fontSize: 13, lineHeight: 1.75 }}
                />
                <div className="char-row">
                  <span>{email.length.toLocaleString()} / 10,000 characters</span>
                  <span>Not saved by this app</span>
                </div>

                <div style={{ marginTop: 18 }}>
                  <span className="mini-label">Try an example</span>
                  <div className="sample-grid">
                    {samples.map((sample) => (
                      <button key={sample.id} type="button" title={sample.tag} aria-label={sample.label} aria-pressed={activeSample === sample.id}
                        onClick={() => chooseSample(sample.id)} disabled={!inputReady}
                        className={"sample-btn " + (activeSample === sample.id ? "active" : "")}>
                        {sample.label}<span className="tag">{sample.tag.replace("Expected: ", "")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {mode === "live" && (
                  <div style={{ marginTop: 16 }}>
                    <label htmlFor="live-access-token" className="field-label">Private live access token</label>
                    <input id="live-access-token" type="password" autoComplete="off" spellCheck={false}
                      value={accessToken} disabled={!inputReady} onChange={(e) => { invalidate(); setAccessToken(e.target.value); }}
                      placeholder="From your local .env.local"
                      className="token-input"
                      style={{ marginTop: 8, width: "100%", padding: "11px 13px", fontSize: 13 }} />
                    <p style={{ marginTop: 7, fontSize: 11, lineHeight: 1.55, color: "var(--ink-3)" }}>Kept in this tab&apos;s memory, not saved to browser storage. Do not share or commit it.</p>
                  </div>
                )}

                <div className="run-row">
                  <div>
                    <label htmlFor="policy-date" className="field-label">{mode === "live" ? "Date is server-controlled" : "Evaluation date"}</label>
                    <input id="policy-date" type="date" value={asOf} disabled={!inputReady || mode === "live"}
                      onChange={(e) => { invalidate(); setAsOf(e.target.value); }}
                      className="date-input"
                      style={{ marginTop: 8, height: 42, padding: "0 11px", fontSize: 12 }} />
                  </div>
                  <button type="button" onClick={() => analyze()}
                    disabled={!inputReady || busy || email.trim().length < 20 || email.length > 10000 || !asOf || (mode === "live" && accessToken.length < 32)}
                    className="primary-btn">
                    {busy ? <span className="busy-spinner" aria-hidden="true" /> : <Zap size={15} aria-hidden="true" />}
                    <span>{busy ? "Analyzing request…" : mode === "live" ? "Run Clocked analysis" : "Run demo analysis"}</span>
                    {!busy && <ArrowRight size={16} aria-hidden="true" />}
                  </button>
                </div>
                <div aria-live="polite" aria-atomic="true" role="status" className="run-note">
                  {busy ? "Checking this message. No refund will be issued." : result ? "Analysis complete. The recommendation is " + (detailLane?.title ?? "") + "." : ""}
                </div>
                {error && <p ref={errorRef} role="alert" className="error-box">{error}</p>}
                <p className="caveat"><ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                  {mode === "live"
                    ? "Live requests may cost Clocked credits. Dates come from the server, and personal-data masking is not perfect. Use only data you have permission to send."
                    : "This demo uses local rules, not Clocked API calls. Please use made-up customer details."}
                </p>
              </div>
            </section>

            <section ref={outputRef} className="card scroll-mt-4" aria-labelledby="result-heading" id="decision-panel">
              <div className="card-head">
                <div>
                  <div className="card-eyebrow">02 / Result</div>
                  <h2 id="result-heading" className="card-title">Suggested next step</h2>
                </div>
                <span className="header-meta">{result ? result.mode === "demo" ? "SIMULATED" : "CLOCKED LIVE" : "READY"}</span>
              </div>
              <div className="card-body">
                <p className="pipeline-note">{(result?.mode ?? mode) === "demo"
                  ? "This demo checks the request locally. It does not call Clocked."
                  : busy ? "Analyzing with Clocked. Individual provider status is not reported while processing."
                    : "The results will show which Clocked checks were completed."}</p>
                <div className={"pipeline " + ((result?.mode ?? mode) === "demo" ? "pipeline-demo" : "pipeline-live")} aria-label="Analysis pipeline">
                  {((result?.mode ?? mode) === "demo" ? demoPipelineStages : pipelineStages).map((stage, i) => {
                    const st = stageState(stage.id);
                    const label = st === "done" ? "Complete" :
                      st === "skipped" ? "Not run" : st === "attention" ? "Needs review" :
                      st === "active" ? "Processing" : st === "ready" ? "Ready" : "Not started";
                    const highlight = st === "done" && (stage.id === "recommend" || stage.id === "decide");
                    return (
                      <div key={stage.id} className={"pp-stage " + st + (highlight ? " outcome-done" : "")}
                        aria-label={stage.name + ": " + label}>
                        <span className="pp-marker" aria-hidden="true">
                          {st === "done" ? <CheckCircle2 size={16} /> :
                            st === "attention" ? <CircleAlert size={16} /> :
                            st === "active" ? <Sparkles size={16} /> :
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                        </span>
                        <span className="pp-name">{stage.name}</span>
                        <span className="pp-sub">{stage.sub}</span>
                        <span className="pp-status">{label}</span>
                      </div>
                    );
                  })}
                </div>

                {result && summary ? (
                  <div key={requestEpoch} className={"reco reco-" + result.lane} style={{ marginTop: 16 }}>
                    <div className="reco-top">
                      <span className="reco-kicker">
                        {result.lane === "review" ? <CircleAlert size={16} /> : result.lane === "approve" ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                        Recommendation
                      </span>
                      <span className="reco-id">{result.requestId}</span>
                    </div>
                    <h3 className="reco-word">{result.lane === "approve" ? "APPROVE" : result.lane === "review" ? "HUMAN REVIEW" : "DECLINE"}</h3>
                    <p style={{ marginTop: 4, fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{summary.label}</p>
                    <p className="reco-desc">{summary.description}</p>
                    <div className="reco-next">
                      <span className="reco-next-label">What to check next</span>
                      <span className="reco-next-text">{summary.nextAction}</span>
                    </div>
                  </div>
                ) : (
                  <div className={"waiting " + (busy ? "waiting-busy" : "")} style={{ marginTop: 16 }}>
                    <div className="waiting-orb"><FileSearch size={24} strokeWidth={1.8} aria-hidden="true" /></div>
                    <div className="waiting-title">{busy ? "Checking the evidence" : "Ready to check a request"}</div>
                    <p className="waiting-copy">{busy ? "Checking the request, dates, possible problems and missing details." : "Choose an example or paste a message to see what needs attention."}</p>
                  </div>
                )}

                <div className="lane-strip" role="group" aria-label="Available recommendation routes">
                  {lanes.map((lane) => (
                    <div key={lane.id} className={"lane-cell " + (result?.lane === lane.id ? "sel-" + lane.id : "")}>
                      <span className="lane-head">
                        <span className="lane-dot" aria-hidden="true" />
                        <span className="lane-title">{lane.title}</span>
                        {result?.lane === lane.id && <CheckCircle2 size={14} style={{ marginLeft: "auto" }} aria-hidden="true" />}
                      </span>
                      <span className="lane-sub">{lane.subtitle}</span>
                    </div>
                  ))}
                </div>

                {result && (
                  <div className="case-summary">
                    <div className="case-cell">
                      <span className="mini-label">Claimed order</span>
                      <strong style={{ display: "block", marginTop: 5, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.caseScope?.linkedOrderId ?? "Unresolved"}</strong>
                    </div>
                    <div className="case-cell">
                      <span className="mini-label">Delivery age</span>
                      <strong style={{ display: "block", marginTop: 5, fontSize: 13, color: "var(--ink)" }}>{result.elapsedDays === null ? "Unknown" : result.elapsedDays + " days"}</strong>
                    </div>
                    <div className="case-cell">
                      <span className="mini-label">Needs attention</span>
                      <strong style={{ display: "block", marginTop: 5, fontSize: 13, color: pendingChecks.length ? "var(--amber)" : "var(--green)" }}>{pendingChecks.length}</strong>
                    </div>
                  </div>
                )}

                {result && visibleReason && result.lane === "review" && (
                  <div className="attention-line"><CircleAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" /><span>{visibleReason}</span></div>
                )}

                <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 8, borderTop: "1px solid var(--border)", paddingTop: 14, fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
                  <LockKeyhole size={14} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <span>This result is based on what the customer wrote. No store records were checked, and nothing has been sent or refunded.</span>
                </div>
              </div>
            </section>

            <aside className="card inspector" aria-label="Case inspector">
              <div className="insp-section">
                <div className="insp-title">Request details</div>
                {result ? (
                  <>
                    <div className="kv"><span><FileText size={14} aria-hidden="true" /> Request ID</span><strong className="num">{result.requestId}</strong></div>
                    <div className="kv"><span><Package size={14} aria-hidden="true" /> Claimed order</span><strong>{result.caseScope?.linkedOrderId ?? "Unresolved"}</strong></div>
                    <div className="kv"><span><Users size={14} aria-hidden="true" /> Evaluation date</span><strong>{result.asOf}</strong></div>
                    <div className="kv"><span><CircleHelp size={14} aria-hidden="true" /> Delivery age</span><strong>{result.elapsedDays === null ? "Unknown" : result.elapsedDays + " days"}</strong></div>
                    <div className="kv"><span><Fingerprint size={14} aria-hidden="true" /> Details consistent</span><strong>{result.caseScope?.coherent ? "Yes" : result.caseScope ? "Needs review" : "Unknown"}</strong></div>
                  </>
                ) : (
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink-3)" }}>Run a check to see the order details we can find in the message.</p>
                )}
              </div>
              <div className="insp-section">
                <div className="insp-title">Result at a glance</div>
                {result && summary && detailLane ? (
                  <>
                    <div className={"decision-pill dp-" + result.lane}>
                      {result.lane === "approve" ? <CheckCircle2 size={18} /> : result.lane === "review" ? <CircleAlert size={18} /> : <XCircle size={18} />}
                      <span>{detailLane.title} recommended</span>
                    </div>
                    <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: "var(--ink-2)" }}>{summary.label}</p>
                  </>
                ) : (
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink-3)" }}>The suggested next step will appear after you check a request.</p>
                )}
              </div>
              <div className="insp-section">
                <div className="insp-title">What matters</div>
                {result ? (
                  <ul className="factor-list">
                    {result.checks.slice(0, 4).map((check) => (
                      <li key={check.label}>
                        <span style={{ color: check.status === "pass" ? "var(--green)" : check.status === "fail" ? "var(--red)" : "var(--amber)", flexShrink: 0, marginTop: 1 }}>
                          {check.status === "pass" ? <CheckCircle2 size={14} /> : check.status === "fail" ? <XCircle size={14} /> : <CircleHelp size={14} />}
                        </span>
                        <span>{check.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink-3)" }}>Important details will appear here after a check.</p>
                )}
              </div>
              <div className="insp-section insp-actions">
                <a className="terra-btn" href="#evidence-details" onClick={() => setActiveSection("evidence")}
                  style={{ textDecoration: "none" }}><Inbox size={15} aria-hidden="true" /> Inspect Evidence</a>
                <button type="button" className="ghost-btn" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Clear request</button>
              </div>
            </aside>
          </div>

          {!result && (
            <section id="evidence-details" className="inspect" aria-label="Case evidence and decision details">
              <div className="empty-state"><b>Run a check to see the details</b>
                <span>Choose one of the example requests to see the details and the reasons for the result.</span>
              </div>
            </section>
          )}
          {result && (
            <section ref={evidenceRef} id="evidence-details" className="inspect" aria-label="Case evidence and decision details">
              <div className="inspect-head">
                <div>
                  <div className="card-eyebrow">03 / Inspect</div>
                  <h2 style={{ marginTop: 3, fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Why this result?</h2>
                </div>
                <span className="header-meta">Open any section to see more</span>
              </div>
              <div className="details-grid">
                <DetailSection label="01" title="Details found in the message" count={result.evidence.length + " exact spans"}>
                  <div className="source-text"><EvidenceText text={result.redactedText} evidence={result.evidence} /></div>
                  <p style={{ marginTop: 11, fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-3)" }}>The highlighted words show where we found each detail. They do not prove that the claim is true.</p>
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>
                    {result.evidence.map((entry) => (
                      <div key={entry.id} className="evidence-item">
                        <div className="mini-label">{entry.label}</div>
                        <div style={{ marginTop: 6, wordBreak: "break-word", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{entry.value}</div>
                        <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ink-3)" }}>Characters {entry.start} to {entry.end}{entry.confidence === null ? "" : " · Extraction confidence: " + asPercentage(entry.confidence)}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-3)" }}>{result.privacyNotice}</p>
                </DetailSection>

                <DetailSection label="02" title="Order and request details" count={result.caseScope?.coherent ? "No obvious conflicts" : "Needs review"}>
                  {result.caseScope ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div className="data-row"><span>Referenced orders</span><strong>{result.caseScope.orderRefs.join(", ") || "None identified"}</strong></div>
                      <div className="data-row"><span>Delivery dates</span><strong>{result.caseScope.deliveryDates.join(", ") || "Not identified"}</strong></div>
                      <div className="data-row"><span>Current intent</span><strong style={{ textTransform: "capitalize" }}>{result.caseScope.intent.replace("-", " ")}</strong></div>
                      {result.caseScope.issueSignals.length > 0 && <div className="data-row"><span>Issue signals</span><strong>{result.caseScope.issueSignals.join(", ")}</strong></div>}
                      {result.caseScope.blockers.length > 0 && (
                        <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                          {result.caseScope.blockers.map((b, i) => (
                            <li key={i} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.55, color: "var(--amber)" }}>
                              <CircleAlert size={14} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" /><span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!result.caseScope.blockers.length && <p style={{ fontSize: 12, lineHeight: 1.65, color: "var(--ink-2)" }}>We did not find conflicting details in this message. The actual order still needs checking.</p>}
                    </div>
                  ) : <p style={{ fontSize: 12, color: "var(--ink-2)" }}>No extra order details were found.</p>}
                </DetailSection>

                <DetailSection label="03" title="Request checks" count={result.mode === "demo" ? "Heuristics" : "Clocked Decide"}>
                  <div style={{ display: "grid", gap: 18 }}>
                    {result.assessments.length === 0 && <p style={{ fontSize: 12, color: "var(--ink-2)" }}>No assessments were returned. A safety check may have stopped the request.</p>}
                    {result.assessments.map((a) => (
                      <div key={a.id}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{a.label}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)" }}>{a.answer === null ? "Unknown" : a.answer ? "Yes" : "No"}</span>
                        </div>
                        {a.probability !== null && <div className="prob-track" style={{ marginTop: 8 }}><div className="prob-fill" style={{ width: Math.min(100, Math.max(0, a.probability * 100)) + "%" }} /></div>}
                        <div style={{ marginTop: 5, textAlign: "right", fontSize: 10.5, color: "var(--ink-3)" }}>{result.mode === "demo" ? "Demo estimate; no model call" : "P(Yes): " + asPercentage(a.probability)}</div>
                      </div>
                    ))}
                  </div>
                </DetailSection>

                <DetailSection label="04" title="Policy and safety checks" count={pendingChecks.length ? pendingChecks.length + " need attention" : "All checks passed"}>
                  <div style={{ display: "grid", gap: 14 }}>
                    {result.checks.map((check) => (
                      <div key={check.label} className="check-row">
                        <StatusIcon status={check.status} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)" }}>{check.label}</div>
                          <div style={{ marginTop: 2, fontSize: 11.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{check.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <div className="mini-label">Decision rationale</div>
                    <ul className="reasons-list" style={{ marginTop: 10 }}>
                      {result.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                    </ul>
                  </div>
                  <p style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-3)" }}>{result.policyNotice}</p>
                </DetailSection>
              </div>
            </section>
          )}

          <footer className="footer">
            <span>Clocked Return Lab | Return request review</span>
            <span>Example 30 day policy. No refunds issued. Clocked live is disabled on this public demo.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
