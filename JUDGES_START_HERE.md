# Judges: Start here — Clocked Return Lab

**Clocked Build Challenge 2026 | Public, reproducible decision-support prototype**

Clocked Return Lab turns unstructured customer refund emails into **Approve / Human Review / Decline recommendations**, each with supporting source text and a clear next step. It cannot issue refunds, send emails or edit orders.

## Demo videos

**[Current UI — synthetic three-case walkthrough](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v3/clocked-return-lab-post-p0-demo.webm)**

The demo-v3 recording was made from the PREVIOUS P0 implementation at commit d85ff5a and shows only three built-in simulated cases, not the subsequent synthetic-product-identity boundary. A refreshed recording should be made after the catalog-gate PR is independently accepted. The recording made zero Clocked provider calls.

**[Historical real Clocked API demonstration](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm)**

This earlier video exercised actual provider calls but predates the latest parser, case-integrity safeguards and UI revisions. It is not evidence that the current code was retested with the live provider.

## Four meaningful Clocked integrations

Implementation: [lib/pipeline.ts](lib/pipeline.ts), [lib/evidence.ts](lib/evidence.ts), [lib/policy.ts](lib/policy.ts).

| Endpoint | How its output changes behavior |
| --- | --- |
| **Protect (pii)** | Returns anonymized text. A failed or invalid result stops analysis; an additional local scrub catches common leftover identifiers. |
| **Guard (injection)** | Evaluates prompt-injection risk. Suspicious, ambiguous or failed outcomes prevent Extract and Decide calls and route to Human Review. |
| **Extract** | Returns exact field values, confidence and Unicode code-point offsets. Unaligned or low-confidence evidence cannot support Approve/Decline. |
| **Decide** | Returns typed probabilities about refund intent, unused condition and defects. Unknown probability remains Unknown. Independent local gates require recognized synthetic fixture identity plus coherent order, condition, date and intent before either Approve or Decline. An unregistered or suspicious product description routes Human Review even when Decide returns a confident false negative. |

**Latest P0 identity-boundary revision:** The independent audit found that hazards hidden inside arbitrary product names (for example, 'Aurora Desk Lamp toxic with warm light') could still receive Approve or Decline. The fix in this source revision validates the ENTIRE product text against a closed synthetic fixture registry, refusing both automated advisory outcomes for unknown names or variants, even if Decide reports no problem. This is NOT merchant database verification. All outcomes remain advisory, and the current revision has not been tested against the paid Clocked provider.

A deterministic policy then evaluates current intent, delivery age, single-order consistency, exceptions and unclassified statements. Claims are customer-reported, not merchant-verified.

## Run the current UI with zero credentials

1. Install Node.js 22.
2. Run: npm ci
3. Run: npm run dev
4. Visit: http://localhost:3000
5. Keep **Demo fixtures** selected. Try Clear return, Defective item and Outside window, clicking **Run demo analysis** for each.
6. Expand Source-linked extraction, Case linkage & intent, Typed assessments, and Policy & safety gates.

The demo mode performs no Clocked calls. The separate live mode requires secure credentials and provider billing safeguards. See [LIVE_VALIDATION_PREPARED.md](LIVE_VALIDATION_PREPARED.md).

## Test and reproducibility evidence

- **913 local automated tests** passed (641 previous + 272 new independent synthetic catalog-boundary tests). Of the 194 local identity-boundary cases, 76 cover unknown product descriptions across both formats and 60 cover hazards across dates and formats; the remaining cases verify benign names and optimistic mocked-policy behavior. Another 42 cases exercise the complete mocked Protect/Guard/Extract/Decide integration; 36 additional cases cover warning symbols and punctuation in raw Product: fields. No paid provider calls.
- **182 synthetic HTTP red-team and mutation cases** passed.
- **19 local security/browser assertions** passed, alongside mobile UI and browser smoke tests.
- [.github/workflows/ci.yml](.github/workflows/ci.yml) provides CI for tests, TypeScript, lint and production build without provider API calls.
- Independent findings and repairs: [VIBE report](VIBE_REMEDIATION_REPORT.md), [repair matrix](VIBE_REMEDIATION_MATRIX.md), original audit branch audit/vibe-independent.

Test success is not evidence of universal security, model accuracy, verified customer facts or legal eligibility.

## Product boundaries

- All routes are advisory. **No money moves.**
- Customer-supplied order IDs and dates are not verified against Shopify, a merchant ERP or carrier.
- The sample 30-day cutoff is illustrative, not statutory law. Rights and defect exceptions require human review.
- PII masking is imperfect. Test with synthetic or authorized data only.
- In-memory live request quotas are not a distributed spending cap. Do not expose the paid endpoint publicly without durable auth, billing controls and monitoring.
- This is a new hackathon prototype, not a production merchant integration.

[Project README](README.md) · [Submission narrative](SUBMISSION.md) · [Approved screenshot](assets/approved.png) · [Human Review](assets/review.png) · [Decline](assets/declined.png) · [Official rules](https://clocked.rezolve.ai/build-challenge/rules)
