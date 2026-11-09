# Clocked Return Lab

**Evidence-first returns and refunds triage, powered by Clocked.**

Small support teams get incomplete return emails, contradictory details and product complaints. Clocked Return Lab turns each request into an **Approve**, **Human Review** or **Decline** recommendation with visible source evidence and conservative local checks.

> **Advisory prototype:** Nothing here verifies a real merchant order, issues a refund, sends a message or changes a payment. The 30-day example policy and product catalog are synthetic demonstration fixtures.

**[Watch the narrated demo (~101 seconds)](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v6/clocked-return-lab-narrated-demo.mp4)** · [Judges' guide](JUDGES_START_HERE.md) · [Submission details](SUBMISSION.md)

![Clocked Return Lab, Tuscan Sunset interface](assets/dashboard.png)

## What makes it useful

- **Traceable claims.** Extracted information is linked to exact character spans in the customer message. This is source alignment, not verification of truth.
- **Real SDK orchestration in live mode.** Clocked Protect masks PII; Guard detects suspicious instructions and can stop the workflow; Extract returns fields with offsets; Decide produces typed assessments.
- **Conservative human handoff.** Local checks require coherent order linkage, date, intent, condition and absence of unresolved exceptions. Unclear cases go to Human Review.
- **No hidden execution.** All outcomes are advice, with reviewable checks. No refunds, payments or emails are executed.

The provider integration is in [lib/pipeline.ts](lib/pipeline.ts), typed interpretation in [lib/evidence.ts](lib/evidence.ts), and decision rules in [lib/policy.ts](lib/policy.ts).

## Demo vs. live

| | Demo fixtures | Clocked live |
|---|---|---|
| Processing | Local heuristics | Protect → Guard → Extract + Decide, then local policy |
| Cost | Zero provider calls | May consume paid or promotional credits |
| Data | Synthetic customer messages only | Authorized data only; PII masking is best effort |
| Access | No credentials | Server API key and separate private access token |

**The new narrated video is entirely synthetic.** It never invokes Clocked endpoints. An [older historical recording with actual Clocked calls](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm) shows an earlier implementation and does **not** validate the newest safety fixes.

## Run locally

Requires Node.js 22+ and npm. From a terminal:

    git clone https://github.com/Cho3en/clocked-returns-refund-autopilot.git
    cd clocked-returns-refund-autopilot
    npm ci
    npm run dev

Open http://localhost:3000, select **Demo fixtures**, and try the built-in cases: Clear return, Defective item and Outside window. Expand source extraction, policy gates and typed assessments.

For optional private live mode, copy .env.example to .env.local, set a server-side CLOCKED_API_KEY and an unrelated random RETURNLAB_ACCESS_TOKEN of at least 32 characters. Only the access token goes into the browser. Never commit either value. Live requests may incur charges.

## Reliability evidence

On the latest local branch, the following were independently run and passed:

- **918/918** unit and synthetic regression tests, 11 files.
- TypeScript, ESLint and production build.
- Browser smoke plus UI checks at 320, 360, 390, 768, 1024 and 1440px.
- **20/20** security checks; **32/32** UI adversarial cases.
- **32 independent**, **76 mutation** and **42 held-out** HTTP adversarial cases.
- Production dependency audit reported **zero vulnerabilities** on November 9, 2026.

Scripts and exact commands are listed in [package.json](package.json). Browser checks require the app running locally and RETURNLAB_URL pointing at it. The GitHub workflow runs the standard build/test gates; it does not automatically run all HTTP/browser checks.

**Known limitations:** No merchant catalog, order database, shipping verification, legal determination, payment execution, email dispatch, persistent case history, or cloud-wide billing cap. The newest live SDK workflow has not been retested using paid Clocked calls after recent safety improvements. The product is mainly tested with English requests. Never use the synthetic demo for real customer PII.

## Clocked Build Challenge

Built for the [Clocked Build Challenge](https://clocked.rezolve.ai/challenge), October 21–November 10, 2026. Announced entry deadline: November 10, 2026, 11:59 p.m. ET (November 11, 05:59 in Zagreb). **A public GitHub repo is not a submitted entry.**

[Judges' guide](JUDGES_START_HERE.md) · [Submission narrative](SUBMISSION.md) · [Entry form copy](ENTRY_FORM_COPY.md) · [Technical audit archive](docs/archive/)
