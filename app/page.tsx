import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Clocked Return Lab | Return review with evidence",
  description: "Clocked Return Lab reads a customer return request, tests it against an example return window and safety rules, and recommends Approve, Human Review, or Decline with the exact words behind each result.",
};

const SOURCE_URL = "https://github.com/Cho3en/Clocked-Return-Lab";
const VIDEO_URL = "https://github.com/Cho3en/Clocked-Return-Lab/releases/tag/demo-v7";

const checkRows = [
  { label: "30 day return window", detail: "12 days since the claimed delivery date" },
  { label: "Unused condition", detail: "Stated and uncontradicted in the message" },
  { label: "Refund request", detail: "Current, explicit and addressed to the store" },
  { label: "Legal and damage exceptions", detail: "No issue reported in this message" },
];

const stages = [
  { name: "Protect", copy: "Masks emails, phone numbers and card numbers before anything else reads the request.", mark: "01" },
  { name: "Guard", copy: "Screens for prompt injection and stops the run when the message looks manipulative.", mark: "02" },
  { name: "Extract", copy: "Returns each detail with the character positions it came from, so nothing is invented.", mark: "03" },
  { name: "Decide", copy: "Answers focused questions about intent, condition and reported damage.", mark: "04" },
];

export default function HomePage() {
  return (
    <div className="mk">
      <header className="mk-nav">
        <Link className="mk-brand" href="/">
          <span className="mk-brand-mark" aria-hidden="true" />
          <span className="mk-brand-text">Clocked Return Lab</span>
        </Link>
        <nav className="mk-nav-links" aria-label="Main">
          <a href="#showcase">Product</a>
          <a href="#method">Method</a>
          <Link href="/lab">Workspace</Link>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Source</a>
        </nav>
        <Link className="mk-nav-cta" href="/tour">Try the demo</Link>
      </header>

      <main>
        <section className="mk-hero">
          <span className="mk-eyebrow">Return review with evidence</span>
          <h1 className="mk-display">
            Every return decision,<br className="mk-br" /> backed by the words<br className="mk-br" /> that caused it.
          </h1>
          <p className="mk-sub">
            Clocked Return Lab reads a customer message, tests it against your return window and safety rules, then
            recommends Approve, Human Review or Decline. Each result shows the exact text behind it, and nothing is
            refunded.
          </p>
          <div className="mk-ctas">
            <Link className="mk-cta" href="/tour">Try the three cases</Link>
            <a className="mk-cta-quiet" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">View source</a>
          </div>
          <p className="mk-micro">No sign up. No API key. Sample data only.</p>

          <div className="mk-showcase" id="showcase">
            <div className="mk-frame">
              <div className="mk-frame-bar">
                <span className="mk-dot" aria-hidden="true" />
                <span className="mk-dot" aria-hidden="true" />
                <span className="mk-dot" aria-hidden="true" />
                <span className="mk-frame-url">case ORD-24015, clear return</span>
                <span className="mk-frame-tag">Simulated</span>
              </div>
              <div className="mk-frame-body">
                <div className="mk-message">
                  <div className="mk-message-head">
                    <span>Customer message</span>
                    <span>5 spans found</span>
                  </div>
                  <p>
                    Subject: Return request for order <mark>ORD-24015</mark>
                  </p>
                  <p>
                    Hi, my order for the <mark>Atlas Desk Lamp</mark> was delivered 12 days ago. It is{" "}
                    <mark>unused and unopened</mark> in its original packaging. <mark>I want a refund.</mark>
                  </p>
                  <div className="mk-fields">
                    <span>Order ORD-24015</span>
                    <span>Atlas Desk Lamp</span>
                    <span>Delivery date</span>
                    <span>Condition unused</span>
                    <span>Request refund</span>
                  </div>
                </div>
                <div className="mk-verdict">
                  <div className="mk-verdict-head">
                    <span>Recommendation</span>
                    <span>DEMO-4DF353ED</span>
                  </div>
                  <div className="mk-verdict-word">Approve</div>
                  <p className="mk-verdict-note">Inside the example window. An agent confirms the order before acting.</p>
                  <ul className="mk-checks">
                    {checkRows.map((row) => (
                      <li key={row.label}>
                        <span className="mk-check-label">{row.label}</span>
                        <span className="mk-check-detail">{row.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <p className="mk-caption">The real result card, filled with the first sample case.</p>
          </div>
        </section>

        <section className="mk-section mk-problem" aria-labelledby="mk-problem-title">
          <h2 id="mk-problem-title" className="mk-h2">A return email hides the decision.</h2>
          <div className="mk-grid-3">
            <article className="mk-card">
              <span className="mk-card-mark">01</span>
              <h3>The date is missing</h3>
              <p>Without a delivery date the window cannot be tested, so a fast answer is a guess.</p>
            </article>
            <article className="mk-card">
              <span className="mk-card-mark">02</span>
              <h3>The claim contradicts itself</h3>
              <p>Unopened in one line and used in the next. Someone has to notice before the reply goes out.</p>
            </article>
            <article className="mk-card">
              <span className="mk-card-mark">03</span>
              <h3>The rule has exceptions</h3>
              <p>Defects, safety problems and buyer rights sit outside a plain 30 day window.</p>
            </article>
          </div>
        </section>

        <section className="mk-section mk-band" aria-labelledby="mk-method-title" id="method">
          <div className="mk-band-head">
            <h2 id="mk-method-title" className="mk-h2">Four services read the message. Your rules make the call.</h2>
            <p className="mk-band-copy">
              The live path uses Clocked Protect, Guard, Extract and Decide. The policy layer in this app then decides
              what to recommend, and it prefers a person over a guess.
            </p>
          </div>
          <div className="mk-stages">
            {stages.map((stage) => (
              <article className="mk-stage" key={stage.name}>
                <span className="mk-stage-mark">{stage.mark}</span>
                <h3>{stage.name}</h3>
                <p>{stage.copy}</p>
              </article>
            ))}
          </div>
          <div className="mk-truth">
            <div className="mk-truth-col is-here">
              <span className="mk-truth-flag">Runs on this site</span>
              <h3>Public demo</h3>
              <ul>
                <li>Local rule engine, deterministic results.</li>
                <li>No network calls to Clocked in demo mode.</li>
                <li>Sample customers only, messages are not stored.</li>
              </ul>
            </div>
            <div className="mk-truth-col">
              <span className="mk-truth-flag">Implemented for live use</span>
              <h3>Clocked path</h3>
              <ul>
                <li>Server token plus four operator attestations before any spend.</li>
                <li>Guard blocks the run before Extract and Decide are called.</li>
                <li>Disabled on this deployment. Live requests return HTTP 503.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mk-section mk-close" aria-labelledby="mk-close-title">
          <h2 id="mk-close-title" className="mk-close-title">Three cases. Under two minutes.</h2>
          <p className="mk-close-copy">
            Approve, Human Review and Decline, each produced by the same engine you can run yourself in the workspace.
          </p>
          <div className="mk-ctas mk-ctas-center">
            <Link className="mk-cta" href="/tour">Start the judge tour</Link>
            <a className="mk-cta-quiet" href={VIDEO_URL} target="_blank" rel="noopener noreferrer">Watch the walkthrough</a>
          </div>
          <div className="mk-lanes" aria-hidden="true">
            <span className="mk-lane is-approve">Approve</span>
            <span className="mk-lane is-review">Human Review</span>
            <span className="mk-lane is-decline">Decline</span>
          </div>
        </section>
      </main>

      <footer className="mk-footer">
        <div className="mk-footer-brand">
          <span className="mk-brand-mark" aria-hidden="true" />
          <span>Clocked Return Lab</span>
        </div>
        <nav className="mk-footer-links" aria-label="Footer">
          <Link href="/tour">Judge tour</Link>
          <Link href="/lab">Workspace</Link>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Source</a>
          <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer">Demo video</a>
          <a href={SOURCE_URL + "/blob/main/JUDGES_START_HERE.md"} target="_blank" rel="noopener noreferrer">Judges guide</a>
        </nav>
        <p className="mk-footer-note">
          Example 30 day policy. Sample data only. No refunds, messages or payments are sent. Built for the Clocked Build Challenge.
        </p>
      </footer>
    </div>
  );
}
