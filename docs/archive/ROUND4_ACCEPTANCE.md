> Historical record. This report describes an earlier build. See [docs/archive/README.md](README.md) for current status.

# Round 4: release acceptance  -  fail-closed refund triage and modern UI

Date: November 8, 2026
Target: Clocked Returns & Refund Autopilot, modern UI branch from commit 24e5da1
Evidence type: local production-server tests and synthetic mocked services. No production customer data, payments, email actions, or actual Clocked API calls.

## Executive conclusion

**All measured Round 4 safety, browser, and security-header release gates passed on the local candidate.** This supports merging the modern interface and updated advisory decision code into the public source repository. It is NOT evidence of production-ready refunds, legal eligibility or full model reliability.

## What changed

1. **Message interpretation now fails closed.** An unclassified sentence prevents Approve AND Decline. The system cannot infer that a product is safe simply because the known defect regexes and mocked model returned no defect. Existing source-spans, confidence thresholds and Guard sequencing remain in place.
2. **Exception signals expanded.** Safety/injury reports, torn shipments, product and SKU inconsistencies, billing disputes, partial refunds, duplicate charges, recalls and missing components receive human review. The unrecognized-statement boundary also catches novel descriptions not in that list.
3. **Delivery date semantics separated.** An ISO purchase date plus an ISO delivery date no longer creates a false contradiction. Multiple explicit delivery dates still block both positive and negative recommendations.
4. **More usable synthetic cases.** Demo extraction recognizes Shopify-style order numbers, alternate reimbursement wording and basic structured multiline fields. Current requests renewed after an earlier change of mind are recognized only under a narrow explicit phrasing.
5. **Live policy gets the same deterministic safeguards.** Even a Clocked Decide response confidently (but incorrectly) reporting no defect cannot override an unclassified sentence or deterministic exception.
6. **Modern UI preserved.** Decision-first compact outcome, explicit next-human-action text, five-stage pipeline, expandable evidence, mobile scroll-to-result, keyboard support, reduced motion and responsive controls.
7. **HTTP headers secured.** Next.js 16 Proxy generates a new CSP nonce per dynamic HTML request. The app uses a strict script policy and a narrower allowance for inline style attributes, with anti-framing, no-referrer, permissions restrictions and nosniff on HTTP responses. To support nonces, static shell/PPR were disabled; this is a conscious performance-versus-security tradeoff.

## Verified acceptance evidence

| Check | Result |
| --- | --- |
| TypeScript check | PASS |
| ESLint | PASS |
| Production Next.js build | PASS |
| Unit + mocked provider/policy tests, including held-out tests | **291 / 291 PASS** |
| Original post-redesign safety corpus | **32 / 32 PASS; zero unsafe outcomes** |
| Earlier independent HTTP red-team | **32 / 32 PASS** |
| Earlier two-age mutation red-team | **76 / 76 PASS** |
| Fresh post-repair holdout, two age windows | **42 / 42 PASS; zero unsafe outcomes** |
| Security HTTP and browser checks | **19 / 19 PASS** |
| UI browser audit, 320-1440px widths | PASS; zero overflow/page errors |
| Browser smoke including stale-request invalidation | PASS |

### Distinguishing deterministic from mocked live tests

- Deterministic: synthetic messages submitted to the production server with mode=demo, plus direct deterministic policy tests.
- Mocked live: lib/pipeline.ts was invoked with synthetic Clocked service implementations. Guard was made to pass, Extract returned exact spans with p_verify of 0.999, and Decide was deliberately made to assert “no product defect” with p(No) of 0.999. The deterministic safety/context check still required Review for unsafe or unclassified statements. Separate tests verified Guard failures, unknown Guard outputs and low-confidence extractions.
- Post-repair held-out suite: novel paraphrases not used to construct the initial repair, tested in both deterministic and mocked live-policy branches with young and old claimed delivery dates.
- These are not live-provider accuracy measurements and do not measure false negatives in actual Clocked model output.

## Security boundaries and residual risks

- CSP script-src uses per-request nonces and strict-dynamic; a server-delivered inline script without a nonce was blocked by the browser. Style attributes retain a controlled unsafe-inline allowance to support dynamic score-bar widths. This is not a complete penetration test.
- Dynamic rendering costs more server work than static/PPR and should be measured before a large rollout.
- Real Clocked Protect receives the original text before masking; local PII fallback is incomplete for some Croatian identifiers. Only use synthetic or appropriately authorized customer messages.
- Live access uses a separate local token and **in-memory, per-instance** quotas. It is NOT a durable or distributed API spending ceiling. A production public endpoint requires proper user sessions, atomic budgets, reliable throttles and spend monitoring.
- Source alignment and model probabilities cannot verify actual orders, product condition, consumer rights, identity or warehouse/fulfillment records.
- The decision grammar is conservative and English-oriented. Unrecognized benign messages may be held for review. A finite adversarial corpus is not proof that all future harmful messages will be detected.
- The project's previously exposed Clocked API key must be revoked and regenerated before real live-provider validation or recording. Do not expose or print the key.
- The published demo video is from an older source revision. It has NOT been replaced or represented as proof of Round 4 behavior.
- No orders, refunds, payments or outbound messages are automatically executed.

## Reproduce

Use synthetic data and a local production server. Run:
1. npm test
2. npm run lint
3. npm run typecheck
4. npm run build
5. npm run start -- -p 3147 -H 127.0.0.1
6. Set RETURNLAB_URL to http://127.0.0.1:3147 and run npm run redteam:ui, npm run redteam:heldout, npm run redteam, npm run redteam:mutation, npm run ui:audit, npm run smoke, and npm run security:audit.

The new scripts fail with a nonzero process exit status when the observed release gate is not met. None of these require a Clocked API key or generate Clocked charges.

## Next milestone  -  before publishing a new video or public live service

1. User revokes the previously exposed key and installs the replacement privately in .env.local; do not transmit it in chat.
2. With an explicit limited call budget, run real Clocked Protect/Guard/Extract/Decide on a small set of synthetic safety and ambiguity cases and compare to mocked expectations.
3. Add durable per-user authentication, atomic quotas, spending limits, rate throttles and privacy-safe observability before exposing live mode on an internet-facing deployment.
4. Improve multilingual support and real order-validation via a **read-only synthetic merchant order ledger** before making any claim of independently verified order eligibility.
5. Record and inspect a new live demo only after all above relevant gates pass; do not modify the existing release asset before the replacement is validated.

## Sources for CSP design

Official Next.js guide: https://nextjs.org/docs/app/guides/content-security-policy
OWASP Next.js Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html
