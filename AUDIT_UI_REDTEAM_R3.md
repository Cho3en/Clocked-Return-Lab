# Round 3 — Modern UI, Independent Logic Red Team, Code & Security Audit

**Historical findings from the pre-repair candidate.** The decision-safety and security-header release blockers described here were repaired and independently retested in [ROUND4_ACCEPTANCE.md](ROUND4_ACCEPTANCE.md). This file is preserved for audit history.

Date: 2026-11-08
Source baseline: 63b67d0 (P0.1–P0.4)
Scope: local UI redesign followed by independent behavioral and security audits.
Release decision: DO NOT MERGE TO PUBLIC MAIN OR REPLACE VIDEO while safety and security gates fail.
All tests used synthetic inputs; no real Clocked API calls, refunds, private values or real customer information.

## A. UI changes completed locally

- New compact recommendation-first design, clear next human action, small three-lane indicator and claim-scoped summary.
- Five accurate stages: Protect, Guard, Extract, Decide, Route.
- Progressive disclosure of source excerpts, case linkage, model judgments, policy checks and rationale.
- State labels clearly distinguish simulated from live analysis. Approve/Decline are provisional only.
- Improved mode and sample semantics with aria-pressed; live response status with aria-live; native accessible details, visible focus and reduced-motion support.
- Mobile auto-scroll to the completed outcome. No new packages, fonts or external scripts.
- Visually inspected desktop and 390px phone screenshots. No horizontal overflow was found at 320, 360, 390, 768, 1024 and 1440px.
- Final UI audit completed after the styling changes: control target height at least 44px at all six widths, native details toggle via keyboard Enter, result auto-scroll, no overflow or page errors. UI_AUDIT_RESULT: 0 issues.

## B. Independent logic audit — new 32-case corpus

Command: npm run redteam:ui
The cases are distinct from earlier P0 corpora: 25 product/exception messages, 5 usability formats, 2 unambiguous controls.

Observed candidate results:
- 27 unexpected outcomes of 32;
- 22 unsafe Approve recommendations where review was required;
- 5 conservative Review outcomes for plausible eligible refunds;
- 5 expected outcomes.

Representative unsafe approvals: exposed power wire, scratched or bent merchandise, chemical smell, reported rash or burns, unsafe item, stolen or missing shipment, duplicate charge, recall, incorrect specification or SKU, suspected counterfeit, missing package contents, and previously disputed/rejected returns.

Overly conservative reviews: purchase date plus delivery date, Shopify-style order #1043, alternate refund request phrasing, renewed refund following earlier withdrawal, and structured multiline order messages.

These are CONFIRMED failures in DEMO mode, not results from a real Clocked service call. They illustrate that a finite keyword lexicon cannot prove absence of reported product, safety, or billing problems. In the live deterministic policy, a false-negative Clocked Decide judgment can similarly leave unknown problems unflagged; that risk is architectural, not independently demonstrated against the live provider.

The new redteam:ui script intentionally exits nonzero while any unsafe approvals or declines are found, to block accidental release.

## C. Earlier safety suites remain green

- 106 / 106 automated unit/contract tests
- 32 / 32 prior adversarial HTTP cases
- 76 / 76 prior mutation cases
- TypeScript, ESLint and optimized Next.js production build passed after the final touch-size and label updates. Automated tests remained 106/106.
- Final browser smoke passed, including stale-response and invalid-token controls. Synthetic dashboard and outcome screenshots were refreshed locally (approved, review, declined, mobile).

The green historical suites do NOT override the 22 unsafe new decisions.

## D. Independent security pass 1 — dynamic HTTP/browser

Command: npm run security:audit
15 of 15 functional checks passed:
- Home and simulated endpoint accessible;
- 401 for unauthorized live mode;
- 400 for malformed JSON and invalid schema;
- 415 for unsupported content type;
- 413 for oversized normal and chunked JSON;
- API has no-store and X-Content-Type-Options nosniff;
- malicious HTML/JS test remains text; nothing executed;
- no browser JS errors in the tested flow;
- live access token is a password input; browser cannot edit live evaluation date.

However, HTML responses lack:
1. Content-Security-Policy;
2. Anti-framing (CSP frame-ancestors or X-Frame-Options);
3. Referrer-Policy;
4. Permissions-Policy;
5. X-Content-Type-Options at HTML level.

The security:audit command now returns a nonzero exit code for these header omissions. These results do not constitute an external penetration test.

## E. Independent security pass 2 — source and dependencies

- A local source scan of app and lib found no dynamic eval, Function constructor, dangerouslySetInnerHTML, browser localStorage/sessionStorage, document.cookie or browser-side API-key variable.
- Server-only Clocked key and private access token references were found in lib/clocked.ts and app/api/triage/route.ts.
- Git tracks no .env.local, PEM or private key files. A new secret-value scan must be run before any commit.
- npm audit production dependencies: 0 reported vulnerabilities at time of inspection.
- npm audit including development dependencies: 8 moderate advisories.
- Local fallback redaction missed synthetic Croatian mobile formats, OIB-shaped identifiers, street addresses and passport-like IDs; it masked synthetic IBAN, credit-card and email formats. This does NOT prove Clocked PII itself misses them.
- Known historical credential exposure remains unresolved until the user revokes/replaces the old Clocked API key. Do not run paid live tests or record video before rotation.
- Live budgets remain in-memory per process; restarts or multiple workers bypass the intended global spend ceiling. Demo mode has no persistent per-client throttle.
- HTTP body limits and API access gates passing do not establish request read timeouts, session isolation, or enterprise-grade auth.

## F. Usability and scope

Strengths: less visual clutter, immediate human action, clear simulation labels, expandable evidence, keyboard semantics and reduced motion. The new mobile output is actively scrolled into view after analysis.

Boundaries: customer data remains typed in the local input textarea; original messages should be synthetic or authorized. Real store records are not verified. The application is English-oriented and supports narrow demo order/reference formats. The front-end is a decision-support prototype, not an actual refund processor. No real customer usability study or screen-reader session has been conducted.

## G. Improvement plan

P0 — Decision safety before public release
1. Replace the fail-open keyword absence inference with an explicit exception and negative-case classification layer. Detect complaints, safety hazards, delivery issues, billing disputes and product mismatches; unknown or mixed claims must default to Review.
2. Model order/product/date context structurally; distinguish delivery date from order and payment dates; link all evidence to the same requested action. Support corrections without blindly selecting a first match.
3. Improve intent handling (current vs historical, withdrawn vs renewed, exchanges, store credit and support). Require explicit evidence before either Approve or Decline.
4. Permanently add new adversarial and property-based fixtures. Gate release on zero unsafe decisions across ALL independent corpora and a minimum reasonable acceptance rate for clear positive cases.
5. After the old key is revoked and replaced, run a small, capped synthetic live Clocked test to verify both false-negative and ambiguous model outcomes.

P1 — Security and privacy before any public live API
6. Configure CSP, frame protections, referrer and permissions policies, and global nosniff, then rerun browser and HTTP tests.
7. Introduce authenticated sessions and durable shared quotas with atomic per-user budgets, spend monitoring, demo throttles, body read timeouts and privacy-safe tracing.
8. Extend local PII protection and tests; explicitly disclose that the original request is sent to Clocked Protect and masking is best effort.
9. Update and re-audit the eight moderate development advisory dependencies.

P2 — Operator value / usability
10. Provide safe case-summary copy/export and a small read-only human review queue. Never auto-execute refunds.
11. Add a synthetic merchant order ledger with independent order/product/delivery records to demonstrate meaningful verification.
12. Test with keyboard-only and actual screen-reader workflows; refine contrast, mobile density, motion and missing-information explanations.
13. Replace screenshot/video only after the full gate passes and a new synthetic real Clocked recording is inspected.

## Release acceptance gates

- New redteam:ui suite must report zero unsafe Approve or Decline decisions.
- Existing redteam and redteam:mutation, unit tests, typecheck, lint, build, browser audit and UX checks must pass.
- security:audit must pass including all HTML headers and exposure controls.
- No private keys tracked; previously exposed provider key revoked and replaced.
- Never present customer-claimed data as independent verification.
- No public live API without durable auth/rate/spend controls.
- Existing public demo video is pre-redesign and pre-new-audit; do not replace until verified.

Publication status: Local candidate on a separate feature branch only. Keep public GitHub main at 63b67d0 while these release gates fail.
