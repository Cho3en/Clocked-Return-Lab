import Link from "next/link";

export default function NotFound() {
  return (
    <main className="nf-shell">
      <div className="nf-card">
        <div className="nf-kicker">Page not found</div>
        <h1 className="nf-title">That page is not part of the demo.</h1>
        <p className="nf-copy">
          The return review workspace lives on the home page. The judge tour runs the three sample cases in order,
          and the workspace lets you paste and test your own message.
        </p>
        <div className="nf-actions">
          <Link className="hero-cta" href="/">Open the demo</Link>
          <Link className="hero-cta hero-cta-quiet" href="/tour">Start the judge tour</Link>
        </div>
      </div>
    </main>
  );
}
