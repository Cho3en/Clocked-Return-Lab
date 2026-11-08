# Challenge entry — Clocked Return Lab

## Project name
**Clocked Return Lab — Returns & Refund Autopilot**

## Overview (for the entry form)
An evidence-led returns triage application that turns an unstructured customer email into an explainable recommendation: Approve, Human Review, or Decline. It protects personal data before analysis, extracts precise order and delivery evidence, evaluates typed yes/no questions with Clocked's probabilistic judgments, and screens for prompt injection. A conservative single-order policy engine refuses automatic recommendations for conflicting order IDs or delivery dates, withdrawn or quoted intent, alternative return-only/exchange requests, safety complaints, defects and missing information. It applies an illustrative 30-day window only to coherent customer-reported cases. The demo runs three realistic synthetic requests through the real Clocked API. It never executes a refund, sends an email, or edits an order.

## Audience and problem
Independent e-commerce teams spend time reading returns emails, locating order data, interpreting eligibility, and dealing with incomplete requests. A naïve AI classifier can hallucinate dates or recommend a refund for a defective product without reviewing applicable consumer protections. This prototype demonstrates evidence-first triage and explicit human escalation.

## Meaningful Clocked integration

1. **Protect — PII** accepts the original message and returns masked text. An extra local scrub catches obvious residual structured identifiers. This is best-effort protection, not guaranteed anonymization.
2. **Guard — injection** screens protected, untrusted text before any extraction or decisions. A suspicious or unavailable result stops additional Clocked analysis and requires a human.
3. **Extract** retrieves customer-stated order details, delivery, condition, request and issue with source spans. Unicode code-point offsets are converted to JS UTF-16 positions. Low-confidence or mismatched evidence is not trusted for eligibility.
4. **Decide** uses three typed noul judgments about refund intent, unused condition and damage/rights exceptions. Scores with insufficient confidence trigger human review, and the UI displays the returned P(Yes) rather than inventing refund-approval probabilities.
5. **Deterministic policy engine** decides a recommendation from source-grounded values, explicit day arithmetic and exception handling. Model probabilities are never treated as policy facts.

**Why the calls matter:** PII shapes the input, Guard blocks unsafe downstream processing, Extract determines whether sufficiently supported policy gates can be evaluated, Decide supports claim assessments, and deterministic policy checks decide the advisory route. The app fails closed to Review when necessary inputs or checks are uncertain.

## Demonstration
- Video: https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm
- Public source code: https://github.com/Cho3en/clocked-returns-refund-autopilot
- Screenshots: assets/approved.png, assets/review.png, assets/declined.png and assets/mobile.png

Three live test paths: (1) unused, within example return window -> **Approve recommendation**; (2) damaged or defective without reliable delivery date -> **Human Review**; (3) unopened product 58 days after delivery -> **Decline recommendation**.

## Judge-facing notes
- New project developed during the contest build window (created November 8, 2026).
- Built with Next.js 16, TypeScript, Clocked JavaScript SDK and browser-based tests.
- Includes a local deterministic demo mode, distinct from actual Clocked mode.
- Validated real Clocked calls in all three test cases, including PII masking, exact extraction, Decide probabilities and Guard thresholds.
- A review/decline/approve recommendation is not an executed financial action.
- Example 30-day policy is illustrative, not legal advice or a production store policy. Statutory rights, defects, warranties, conflicts and missing data require human review.
- Source-controlled .env.example contains no credentials; .env.local is excluded from Git.
- Includes setup instructions, development commits, 106 automated regression/contract tests, two independent adversarial HTTP suites (32 and 76 cases), browser smoke tests, and transparent [P0 acceptance notes](P0_ACCEPTANCE.md).

## Categories to select in the entry form
1. Best Overall App
2. Best Use of Decide, Extract, or Fill
3. Best Use of Protect, Guard, or Inspect

Best Use of Verify, Compare, or Rerank should not be selected, as none of those endpoints is currently integrated.
People's Choice is optional and needs an eligible public LinkedIn post with an active @mention of Clocked, #ClockedChallenge and a post URL added to the entry form before the deadline.

## Required human steps
- Confirm personal eligibility and Wise payout feasibility privately with the organizer.
- On the official challenge entry form, supply the actual entrant's name, email, GitHub handle and contact details. Never commit these personal fields into public source code.
- Authenticate to Clocked, save the entry with the repository, the demo video, the overview, endpoint explanation, and selected categories.
- Verify the saved entry and that links remain public through November 18, 2026.
- Last on-time submission: **November 10, 2026 at 11:59 PM Eastern (November 11 at 05:59 Zagreb)**. The official saved entry, not the repository alone, constitutes submission.
