# Clocked Build Challenge: Entry text

These are prepared answers for the official submission form. **The project has not been submitted just because this file and the GitHub release exist.** The signed-in entry must be saved and confirmed at https://clocked.rezolve.ai/challenge.

## Project name

Clocked Return Lab - Returns & Refund Autopilot

## Project overview

Return requests rarely arrive with every detail neatly organized. Customers forget dates, mention more than one order or report problems that need special attention. Clocked Return Lab helps a support agent make sense of those messages.

The app uses Clocked Protect, Guard, Extract and Decide to examine a request and show the evidence behind a suggested next step: Approve, Human Review or Decline. It highlights the customer's own words, checks for missing or conflicting information and sends uncertain cases to a person.

It is a working hackathon prototype, not a finished refund service. It does not issue refunds, send emails or modify orders. The current demo uses synthetic cases and a controlled product list rather than real merchant records.

## Problem and audience

Small e-commerce teams often handle returns by reading emails, checking dates and figuring out what the customer actually wants. A model can sound certain even when important facts are missing. Our goal is to make that first review clearer and show when a human needs to step in.

## How we use Clocked

1. **Protect:** Masks personal details before further model analysis.
2. **Guard:** Looks for attempts to manipulate the assistant's instructions. Risky or uncertain requests stop here.
3. **Extract:** Pulls out the reported order, product, delivery date, condition and refund intent, with source text positions.
4. **Decide:** Assesses specific questions about intent, condition and possible defects using typed probability results.
5. **Local policy:** Checks that the claims fit together and that the case has enough supporting information. Unknown product names, conflicting facts and exceptions go to Human Review.

The system gives recommendations, not automatic financial decisions.

## Repository

https://github.com/Cho3en/clocked-returns-refund-autopilot

## Current demo video

https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v5/clocked-return-lab-current-demo.webm

This is a simulated three-case recording of the current interface. It makes no paid Clocked calls.

## Earlier real Clocked API demo

https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm

This recording uses a previous version. We include it to show the historical SDK integration, not to claim that the latest safeguards have been checked against live provider responses.

## Technical guide

https://github.com/Cho3en/clocked-returns-refund-autopilot/blob/main/JUDGES_START_HERE.md

## Suggested categories

- Best Overall App
- Best Use of Decide, Extract, or Fill
- Best Use of Protect, Guard, or Inspect

Do not choose the Verify, Compare or Rerank category, since those endpoints are not integrated.

People's Choice has separate LinkedIn post requirements. Include an eligible post URL in the official form if entering that category.

## What changed after testing

Independent reviewers found that early versions could mistake a fault description for a product name. That could lead to an unsafe recommendation. We changed the design so the complete product name must match a known synthetic fixture. If the name is unfamiliar or contains extra wording, a person reviews the case.

The fix is useful for a controlled demo. A real deployment would need trusted store orders, a merchant catalog, actual return rules and stronger account and spending controls.

Our current evidence is **918 automated tests**, **354 separate HTTP adversarial checks** and **20 security and browser assertions**, plus a successful GitHub CI run. The latest version has not been retested against live paid Clocked responses.

## Information to enter privately

Use your actual name, contact email, GitHub handle and any required team details in the official form. Confirm eligibility and payout details with the organizer rather than adding that information to public source files.

**Announced deadline:** November 10, 2026 at 11:59 p.m. Eastern, or November 11 at 05:59 in Zagreb.

The repository alone is not a competition entry. Make sure the form is saved and the submission appears in your account.