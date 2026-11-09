# Security and correctness audit  -  November 8, 2026

This document summarizes the audit and repair work for the Clocked Build Challenge prototype.

## Repaired findings

| Risk | Repair | Evidence |
|---|---|---|
| Incorrect decline for a support question or wrong item | Decline now requires a complete source-grounded return, unused condition, affirmative refund intent, no exception and clear Guard result | tests/hardening.test.ts |
| Stale results for the wrong customer | AbortController and monotonic request generation invalidate in-flight results when message, sample, date or mode changes | scripts/regression-browser.mjs |
| Unicode source offsets mismatch | Translate SDK Unicode code-point offsets to JavaScript UTF-16 before validating and highlighting | tests/hardening.test.ts, tests/pipeline.test.ts |
| Very low-confidence extraction passing policy | Require p_verify or confidence of at least 0.75 in live mode, plus exact source alignment | tests/hardening.test.ts |
| Extraction before prompt-injection screening | Protect, then Guard; Extract and Decide are called only if Guard confidently passes | tests/pipeline.test.ts |
| Unauthenticated paid API | 32+ character independent live access token; timing-safe hashed verification; 8/15 minute, 30/day and 2 active requests per process | tests/hardening.test.ts, scripts/regression-browser.mjs |
| Incomplete PII coverage | Additional sensitive entity categories via Clocked Protect and local fallback scrub for obvious structured identifiers | tests/hardening.test.ts, tests/pipeline.test.ts |
| Negation mistakes | Condition and issue heuristics distinguish "unused" from "not unused", and "not damaged" from defects | tests/hardening.test.ts |
| Browser-controlled live date | Live mode always evaluates against server-side Europe/Zagreb date | tests/hardening.test.ts, scripts/regression-browser.mjs |
| Chunked request beyond stated limit | Read JSON streams with a strict byte limit before decoding/parsing; 413 when over 15 KB | tests/hardening.test.ts |
| General policy question misclassified as a refund request | Require affirmative refund/return intent, not mere discussion of return policy | tests/hardening.test.ts |
| Unverified real-world order data | Explicitly label values as customer-reported. Recommendations have no side effects; verified merchant integrations remain outside the contest prototype | lib/policy.ts, README.md |

## Validation

- 52 unit and contract-style tests passing.
- Production TypeScript, ESLint and Next.js build pass.
- Headless browser regression script passes three demo routes, stale-response invalidation, protected live-token UX, wrong-token rejection, mobile output and JavaScript exception checks.
- Real Clocked API tests verified eligibility, defect escalation, expired return, Unicode input, negated defect wording and prompt-injection escalation with synthetic messages.
- Production dependency audit reported zero vulnerabilities at inspection time.
- Private configuration lives only in the ignored .env.local; the source control history must not include credentials.

## Important residual limitations

This is an **advisory hackathon prototype**, not a production refund decision engine.

- Source alignment and model probabilities cannot verify truth: order numbers, dates, product condition and identities are customer claims, not merchant records.
- PII masking cannot guarantee all identifiers are removed; Clocked receives the original input to perform PII detection. Use synthetic or appropriately authorized data only.
- Model probabilities are uncertainty signals, not guarantees or fraud scores. Unknown results lead to Review.
- Live call quotas are **in-memory per Node.js process**; they are not a distributed spending limit. A public deployment needs persistent shared quotas, authentication, TLS, monitoring and abuse protection.
- Aborting browser requests prevents stale rendering, but already-sent Clocked calls may still consume credits.
- The app cannot send money, issue refunds, reply to customers or change orders.
- Store-specific return policies, statutory rights, warranties and consumer-protection questions require merchant data and qualified human review.

## Run verification locally

Use a private, appropriately configured .env.local and run:

- npm test
- npm run lint
- npm run typecheck
- npm run build
- npm run start -- -p 3137
- npm run smoke

These commands do not require real Clocked charges except the optional live browser demonstration invoked with npm run record. Do not print keys or include them in bug reports.
