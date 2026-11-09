# Clocked Return Lab  -  Second Adversarial Audit and Improvement Plan

*Historical pre-P0 findings from commit 725491f. See [P0_ACCEPTANCE.md](P0_ACCEPTANCE.md) for repaired status, new tests and remaining limitations.*
Date: November 8, 2026
Audited local and published commit: 725491f
Method: independent source and security review PLUS HTTP, headless-browser, and isolated policy-engine adversarial testing.
Safety: synthetic customer data only, no paid Clocked calls, no source modifications, no secret values printed or shared.
Status: DO NOT claim production refund decision reliability. This is a hackathon decision-support prototype.

## Executive decision
- Prior 52 automated tests passed, but 9 of 23 fresh adversarial demo-mode scenarios produced unexpected outcomes. One represents an unresolved product-scope distinction between returns and refunds; the others demonstrate policy/context failures.
- A separate isolated *live-policy-engine contract test* produced an Approve decision with 8/8 passing checks while combining attributes from order ORD-11111 and a refund request for different order ORD-99999. Every synthetic field was an exact source match with p_verify = 0.999. This confirms that exact spans and probabilities do NOT establish that facts belong together.
- Demo-mode exception detection missed smoking/overheating products, wrong color, and products falling apart. Live Clocked Decide could detect some of those, but the deterministic policy has no reliable coverage or binding. Do not claim these exact failures were reproduced against the real Clocked endpoint.
- Additional support, language, privacy, accessibility and deployment boundaries remain.

## Pass 1  -  Black-box adversarial behavior
23 new synthetic test cases were POSTed to the local /api/triage endpoint in demo mode, without Clocked API charges.
9 flagged outcomes:
1. Return requested but refund explicitly disclaimed -> Approve rather than Review. SPECIFICATION AMBIGUITY: return eligibility must be distinguished from refund authorization.
2. Two orders in the same message -> Approve despite ambiguous order attribution.
3. A later conflicting delivery date -> Approve based on first date.
4. "Falling apart and smells burnt" -> Approve instead of issue escalation.
5. Wrong color supplied -> Approve instead of human review.
6. Battery overheating and smoking -> Approve instead of safety review.
7. A quoted statement from a bot saying "I want a refund" -> Approve despite customer denial.
8. Historical quoted refund request followed by change of mind -> Approve.
9. An older date followed by an explicit correction to a recent date -> Decline instead of Review.
Normal eligible requests, clear defects, expired requests, simple injection wording and simple support requests passed their expected demo-mode routes.

Isolated policy-engine test (live mode semantics, mocked inputs): request for ORD-99999 was combined with extracted order/date/product for ORD-11111. All 8 checks passed and returned Approve despite false cross-order attribution.

## Pass 2  -  Source, security and operational audit

### Verified strengths
- Git ignored private .env.local in the inspected HEAD; no .env.local appears in tracked files.
- Live endpoint requires a separate bearer-like secret before paid API access and uses a fixed-size digest comparison.
- A bounded JSON reader rejects bodies over 15 KB, including streamed/chunked bodies.
- The trusted provider key is server-only; there is no NEXT_PUBLIC API key.
- Guard is executed before Extract and Decide; unknown and suspicious Guard outputs route to Review.
- React rendered a test HTML injection payload as escaped text with no script execution.
- Headless browser showed no horizontal overflow at 320, 360, 390, 768, 1024 and 1440 px.
- Current npm advisory check: zero advisories in production dependencies; eight moderate advisories in development dependencies (eslint-config-next / typescript-eslint / minimatch chain). Advisories can change.

### Remaining risks
- No order-level entity binding, cross-field attribution or conflict resolution.
- Regex-based affirmative-intent and exception rules have false positives and false negatives, particularly for quotations, revised requests, negation and unseen safety vocabulary.
- A source-exact high-probability extraction is not a verified external fact; order dates and status come only from the sender's message.
- Local PII fallback missed synthetic Croatian mobile, street address, OIB-style identifier and passport-like ID when upstream masking is assumed to fail. This does NOT prove the Clocked PII endpoint misses them. PII processing begins with the unmasked message sent to Clocked.
- Main page lacks tested Content-Security-Policy, X-Frame-Options and Referrer-Policy response headers; API has nosniff and no-store.
- Live quotas 8/15 minutes, 30/day, 2 active are in-memory per instance; restart and multi-worker deployment reset or multiply the allowance. These are not durable spending ceilings.
- No request read timeout; slow or deliberately unfinished request bodies could hold sockets. Browser AbortController prevents stale UI state but does not guarantee cancellation of already-started Clocked calls.
- No distributed auth, per-user quotas, audit logs, alerting or refund execution (intentional prototype boundary).
- Only English regex conditions/intent and narrow order-reference pattern are supported for decisions. Even with precise simulated extraction and positive Decide results, Shopify-style #1043 and Croatian/German examples route to Review.
- Live mode ignores browser date (correct), but the disabled date input can display a stale browser-local date. Interface omits Guard as a named pipeline step, despite meaningful backend use.
- Desktop layout is clear; mobile full page at 390 × 844 measures 4,848 px (~5.7 viewports); recommendation starts around 1,346 px from top; sample button ~37 px high and mode toggle ~33 px; no aria-pressed on mode buttons, no aria-live analysis status.
- Demo-only regex mode remains freely callable and unmetered. Public deployment requires separate limits even for zero-credit compute.
- In case of provider failures the UI gets a generic 502 with no request-id trace, safe but difficult to diagnose.

## Priority repair plan

### P0  -  Correctness, before updated release/demo
1. Bind every extracted field to a specific order/product/return request. Represent orders as separate records, not a global flat field dictionary. Hard-block Approve and Decline when 2+ distinct orders, conflicting dates, mismatched products or request references appear without a defensible resolution.
2. Distinguish intent types: refund, return-only, exchange, support, complaint, speculative, quoted/historical, withdrawn, and unknown. Treat refund authorization and return eligibility as separate decisions. Require positive current intent tied to an order.
3. Make exception and consumer-safety detection high recall: overheating, smoke, sparking, electric shock, burns, leaking, wrong color/variant, missing components, damaged delivery, not-as-described and statutory-rights issues. Escalate when uncertain; never treat absence of a regex hit as proof there is no issue.
4. Build immutable regression cases from the 23 black-box inputs and cross-order contract test. Add conflict-based property tests and negative examples. Acceptance criterion: no incorrect Approve/Decline on the agreed adversarial decision matrix; reviewed cases correctly explain why.
5. Clearly rename current outcomes as **provisional recommendations based on unverified customer claims**, not validated refunds. If a real verified order source is unavailable, avoid the assertion that all policy conditions are verified.

### P1  -  Security and confidence
6. Confirm rotation of the previously exposed Clocked API key. Never log raw env values. Before any public live deployment, use proper user auth, durable shared quotas/budgets with maximum Clocked credit spend, TLS, rate limiting for both demo/live, request-body read timeouts, CSP and anti-framing headers. Review browser handling of temporary access tokens.
7. Improve PII fallback and its test fixtures for Croatian IDs, local phones and realistic addresses, while retaining the warning that anonymization is best effort. Do not encourage real customer data in fixtures.
8. Add stage-specific timeouts, retry policy, credit accounting, structured privacy-safe failure codes and visible trace IDs. A canceled browser request may still consume credits.
9. Establish explicit signal thresholds using measured validation cases; Decide 0.8/0.2 and p_verify 0.75 are arbitrary until calibrated. Route all unresolved ambiguity to Review.
10. Re-audit and safely update the moderate development-only dependency chain, then rerun build, test and production audit.

### P1  -  User journey and hackathon clarity
11. Make the recommendation, blocking reason and next human action visible above the fold on mobile; collapse lower-priority evidence and probability details. Show concise case metadata, clear Review requirements and remaining checks. Retain source evidence drilldown.
12. Add a named Guard step and a visible safe/unsafe/unavailable status in the pipeline. Avoid misleading labels like fully “verified”, “autopilot” or “privacy-first” without precise context.
13. Add aria-pressed to mode switch, aria-live to analysis status, keyboard focus and minimum 44 px interactive targets. Repeat desktop/mobile screenshot and keyboard walkthrough.
14. Provide an export/copy case summary and a mock human-review outcome. Make the project demonstrably useful without integrating payments or risky automatic actions.

### P2  -  Scope expansion after the robust core
15. Add a strictly read-only synthetic merchant-order ledger and reconciliation; carrier/order dates take precedence over customer claims for the demo. Use it to illustrate how verified facts prevent unsafe decisions.
16. Support actual merchant order-number formats (#1043, alphanumerics, marketplace IDs) and language-aware handling (Croatian, German, etc.) or explicitly scope product to English only.
17. Introduce versioned store-policy configuration and optional missing-information templates. Consider Clocked Fill only if it truly drives a useful missing-data workflow; do not add endpoints merely for award breadth.
18. Before recording a replacement video or claiming higher reliability, run the entire fresh adversarial suite against both deterministic fixtures and selected live synthetic requests subject to a fixed credit allowance.

## Release gates
- No P0 decision-attribution or hazardous-content false approvals/declines in the red-team corpus.
- Static analysis, 52+ unit tests, new regressions, browser smoke, accessibility checks and production build all pass.
- Private credentials not tracked, documented, screenshotted or logged. Old exposed key has been rotated.
- No public live-mode access without durable budgets and authentication.
- Public video and submission reflect exactly the same committed code and boundaries.

## Provenance
The project source and remote GitHub repository were not modified in this audit. This document is a local, untracked audit artifact until deliberately reviewed and committed. The unrelated pre-existing empty New Text Document.txt was left untouched.
