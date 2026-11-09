# VIBE remediation  -  independent handoff and release-candidate verification

**Date:** November 9, 2026
**Base:** main commit e2e4e2d
**Branch:** fix/vibe-audit-remediation
**Source audit:** audit/vibe-independent at dbb00f408242fe24e07783bea0d3eda4ec29165d

## Summary

Recovered Mistral's local, uncommitted remediation work and checked it against the original independent audit, the original source, the existing test suite, and four HTTP regression corpora.

Changes address:
- A false historical-withdrawal classification for a current return-only request that expressly disclaims a refund.
- Recognizing active battery swelling and related electrical hazards as named issue signals, without labeling explicit negations as an affirmative hazard report.
- Preserving exact source offsets for non-ASCII and emoji-containing product names.
- Supporting decimal version numbers such as "2.0" in a product name without incorrectly splitting a statement at the decimal.
- Preventing free-form Unicode product names from swallowing complaint text and bypassing the fail-closed gate. An independent verification found **unsafe synthetic approvals in this candidate** for product phrases such as "Lamp shorting out," "Lamp with exposed wires," "Lamp intermittently shorts," and "Lamp stopped functioning." Fixed by adding complaint detection within the embedded product phrase and permanent regression cases.
- Correcting original audit tests where evidence fixtures were incomplete, Unicode code-point offsets were incorrect, assertions were brittle, or a human-review outcome was intentionally conservative.

This is **advisory triage only**: no real refund, payment, external message, or merchant-order update occurs.

## Reconciliation of 11 original audit failures

The original audit branch remains immutable. The imported test suite uses targeted corrections documented in VIBE_REMEDIATION_MATRIX.md. The 11 original failures included true parser/detection gaps, missing or invalid fixtures, and assertions that incorrectly treated conservative Human Review as a defect. The corrected tests still assert review for unsafe or uncertain input, including HTML entities, Markdown and arbitrary padding.

**Do not infer 11 dangerous application failures.** Neither the prior VIBE audit nor this remediation established unsafe decisions from all 11.

## Validation performed

- Vitest: **462 / 462 passing** after new independent product-name regressions.
- TypeScript, ESLint, and optimized Next.js production build: **PASS**, verified November 9, 2026.
- HTTP adversarial red-team suites: 32 case core, 76 case mutation, 32 case UI release, 42 case held-out. All use synthetic demo requests and no Clocked credits.
- New independent held-out tests: 94 scenario/contract tests for benign and unsafe messages across deterministic and mocked-live policy paths; deliberately optimistic model answers test fail-closed routing.
- UI audit: six viewport widths (320-1440px), keyboard details, auto-scroll, mobile and console errors.
- Security audit: authentication refusal, 15KB streamed request cap, CSP nonce behavior, HTML script blocking, basic browser checks.
- No paid Clocked calls were made. Mocked results are **not** evidence of actual Clocked model accuracy.

## Review A  -  correctness and architecture

**Positive:** direct evidence mapping remains source-aligned and the policy requires a single customer-reported order and delivery date; unknown request statements and ambiguous/unsafe claims escalate to Human Review. Mistral's initial Unicode liberalization introduced an unsafe product-name boundary, independently found and repaired before submission.

**Limitations:** the pattern grammar is English-oriented and finite. A product string that resembles a complaint may be a legitimate catalog name; conservative Human Review is intentional. An unusual fault might still evade all classifiers. A customer-supplied delivery date or order reference is not verified against an external merchant system. The illustrative 30-day rule does not supersede legal rights or merchant policies.

## Review B  -  security and reliability

**Positive controls tested:** server-side provider key, private access token required for live calls, constant-time hashed token comparison, request size gate, strict CSP nonce, anti-framing, referrer and permissions restrictions, controlled Guard-first pipeline, and browser sanitization.

**Residual security risks:** quotas are per-process rather than durable/shared. The demo endpoint lacks persistent public-facing throttling, local PII scrubbing has known jurisdictional blind spots, original content reaches Clocked Protect, and there is no authenticated multi-user system, shared credit ledger, merchant audit trail, or external penetration test. The previously exposed provider API key still requires revocation/replacement if not already rotated.

## Release decision

**CONDITIONAL PASS for a reviewable GitHub pull request only.** This code is not production-ready, not permission to expose a live paid endpoint, and not a replacement for the older public live demonstration.

**Merge and deployment remain separate decisions.** No live-provider tests, automated refunds or public video replacement are part of this remediation.

## Next steps

1. Review the exact diff and this acceptance record in the pull request.
2. Revoke/rotate the previously exposed Clocked key before any actual provider calls.
3. With explicit spend caps, retest a few synthetic scenarios through real Clocked Protect/Guard/Extract/Decide.
4. Add durable authentication, shared spending limits, per-user throttling and merchant record verification before public live rollout.
5. Retest edge cases after any policy grammar changes; do not weaken the fail-closed path to improve superficial approval rates.
