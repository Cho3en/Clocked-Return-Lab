# Official Clocked entry — copy-ready fields

The project is NOT submitted until the official form is saved while logged into https://clocked.rezolve.ai/challenge. Never publish team email addresses, identities, API keys or payment details in the repository.

## Project name
Clocked Return Lab — Returns & Refund Autopilot

## Project overview
Clocked Return Lab turns customer return and refund emails into transparent, evidence-backed recommendations: Approve, Human Review or Decline. Protect detects and masks PII, Guard blocks suspicious instructions, Extract retrieves exact customer claims and source offsets, and Decide evaluates typed intent/condition/defect questions. Deterministic policy gates then detect contradictions, missing facts and exceptional consumer-rights cases. Operators see evidence, uncertainty, reasoning and the next action. This is an advisory prototype for small e-commerce support teams, not an automated refund service.

## Problem and audience
Small merchants spend time reconciling incomplete return requests, dates and policy exceptions. Generative AI may confidently invent facts. Clocked Return Lab demonstrates evidence-first triage and a conservative route to human review when certainty is unavailable.

## How Clocked endpoints change the result
1. **Protect (pii):** returns anonymized text. An invalid result stops the pipeline.
2. **Guard (injection):** judges the protected request and stops Extract/Decide on risky, uncertain or failed results.
3. **Extract:** returns exact customer-stated order, product, delivery date, condition and intent, with source offsets and confidence. Incomplete or unaligned evidence blocks automatic policy recommendations.
4. **Decide:** returns typed probability judgments for refund intent, unused condition and defects. Unknown results are not silently promoted to certainty.
5. **Local policy:** enforces single-order scope, reported delivery age, active intent, exception detection and complete statement coverage before recommending a route.

## Repository
https://github.com/Cho3en/clocked-returns-refund-autopilot

## Current demo video (SIMULATED current UI)
https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v2/clocked-return-lab-current-demo.webm

## Supplemental historical real Clocked API demo
https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm

## Project write-up
https://github.com/Cho3en/clocked-returns-refund-autopilot/blob/main/JUDGES_START_HERE.md

## Recommended judged award categories
- Best Overall App
- Best Use of Decide / Extract / Fill
- Best Use of Protect / Guard / Inspect

Do not select Verify / Compare / Rerank; those endpoints are not integrated. People's Choice requires a qualifying LinkedIn post with its URL saved in the form before the deadline.

## Lessons learned
Source offsets and high model confidence are not independent proof. An adversarial review discovered unsafe approvals from permissive parser boundaries. Our final implementation preserves independent, fail-closed checks even when a model confidently misclassifies a defect. We favor explainable escalation over confidently mistaken financial recommendations.

## Private final entry fields
Enter your actual legal name, contact email, GitHub handle and any team members' required details directly in the official form. Confirm personal eligibility and Wise payment support privately.

**Submission cutoff:** November 10, 2026 at 11:59 p.m. Eastern = November 11 at 05:59 Zagreb. The latest SAVED entry is judged. The repository alone is not a contest submission.
