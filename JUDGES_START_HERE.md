# Clocked Return Lab: Quick guide for judges

**Clocked Build Challenge 2026**

Clocked Return Lab helps a support agent review a customer's refund request. It pulls out the details that matter, shows the relevant text and recommends Approve, Human Review or Decline.

The recommendations are provisional. The app cannot move money, contact customers or edit orders.

## Start with the demo

**[Watch the current three-case walkthrough](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v5/clocked-return-lab-current-demo.webm)**

This is a **simulated recording** from merged commit de454ca. It shows three built-in examples and makes no Clocked API calls. The video demonstrates the interface, not all of the safety tests or live provider accuracy.

**[Watch the older real Clocked API demonstration](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm)**

The older video includes real provider calls, but was recorded before the latest product-name checks and interface changes. We do not claim those earlier responses validate the current code.

## What Clocked contributes

The relevant code is in [lib/pipeline.ts](lib/pipeline.ts), [lib/evidence.ts](lib/evidence.ts) and [lib/policy.ts](lib/policy.ts).

| Step | What happens |
| --- | --- |
| Protect | Masks personal information before the remaining analysis. The app applies an additional local scrub, although masking is not perfect. |
| Guard | Checks for prompt injection. If it flags a concern or fails, the request stops and goes to a person. |
| Extract | Finds the order reference, product, delivery date, condition and request, along with source spans and confidence values. Weak or mismatched evidence is not used for automatic recommendations. |
| Decide | Evaluates a small set of typed questions about intent, unused condition and defects. The result informs the local checks; it does not decide refund eligibility by itself. |
| Local policy | Looks for a consistent order, a usable date, active refund intent, missing details and possible exceptions before choosing a recommendation. |

## A safety problem we found and fixed

During independent testing, the system sometimes swallowed complaints into a product name. A line like "Aurora Desk Lamp toxic with warm light" could wrongly receive an Approve or Decline recommendation.

The current version checks the **entire product name** against a closed set of synthetic product fixtures. Any unfamiliar name or added wording goes to Human Review. We also check the original message, so an extracted short product name cannot hide a longer customer complaint.

This is deliberately cautious. It is not merchant catalog verification or proof of purchase.

## Run the demo yourself

1. Install Node.js 22.
2. Run **npm ci**, followed by **npm run dev**.
3. Open http://localhost:3000.
4. Stay in **Demo fixtures** mode.
5. Try **Clear return**, **Defective item** and **Outside window**.
6. Expand the evidence, case details, assessments and policy checks to see why each recommendation was made.

You do not need an API key for the demo. It uses synthetic customer messages and local heuristics.

## Tests and supporting evidence

- **918 automated tests passed**, including five independent reviewer test blocks with 558 scenario evaluations.
- **354 synthetic HTTP adversarial checks passed** in separate local runs.
- **20 browser and security assertions passed**, along with responsive layout and browser smoke checks.
- GitHub Actions passed tests, TypeScript, lint and the production build on the final main branch.

The GitHub workflow does not automatically run every HTTP and browser check listed above. Those suites were verified separately.

The detailed audit records remain in [VIBE_REMEDIATION_REPORT.md](VIBE_REMEDIATION_REPORT.md), [VIBE_REMEDIATION_MATRIX.md](VIBE_REMEDIATION_MATRIX.md) and [P0_ACCEPTANCE.md](P0_ACCEPTANCE.md).

## What this project does not do

It does not verify orders or delivery dates with Shopify, another store system or a carrier. Its products are controlled demo fixtures, and its 30-day return window is an example rather than a merchant's actual policy. A person must review safety concerns, defects, warranty questions and potential statutory rights.

The final version has not been retested with paid live Clocked calls. Protect masking is not a guarantee of anonymity, and the current request limits are per server process rather than a provider-enforced spending cap.

This is a hackathon prototype designed to show a careful first review. It is not a production refund service.

[README](README.md) | [Submission summary](SUBMISSION.md) | [Sample Approve](assets/approved.png) | [Human Review](assets/review.png) | [Sample Decline](assets/declined.png) | [Official rules](https://clocked.rezolve.ai/build-challenge/rules)