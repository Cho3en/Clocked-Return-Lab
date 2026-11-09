# Clocked Return Lab: Challenge submission

## Project name

**Clocked Return Lab - Returns & Refund Autopilot**

## Project overview

Customer return emails are often messy. A shopper might leave out the delivery date, refer to two orders or mention a defect halfway through an otherwise straightforward refund request. A support agent has to read everything carefully before deciding what to do.

Clocked Return Lab helps with that first review. It uses Clocked to protect the message, check for suspicious instructions, extract customer-stated details and assess a few specific questions. The result is a recommendation to Approve, send to Human Review or Decline, with the evidence and reasons visible to the operator.

It does not issue refunds, send messages or alter orders. Its 30-day return window and known product names are controlled demo fixtures, not a real merchant policy or inventory.

## Who it is for

Small online stores and support teams that spend time sorting through incomplete returns requests. The goal is to make the first review easier to follow and help the team spot cases that should not be handled automatically.

## How Clocked is used

1. **Protect** masks personal data in the incoming message. A separate local scrub catches some common patterns. The result is best-effort masking, not a privacy guarantee.
2. **Guard** checks the protected text for prompt injection. Risky or uncertain results stop the pipeline and send the case to Human Review.
3. **Extract** identifies fields such as the order number, product, delivery date, condition and refund request. It also provides source positions, so a reviewer can see what the customer actually wrote.
4. **Decide** assesses refund intent, unused condition and defect concerns using typed probability outputs. A high score is not treated as proof that a customer claim is true.
5. **Local policy checks** look for contradictions, missing evidence, multiple orders, disputed intent and other exceptions. The system only gives an Approve or Decline recommendation for a complete, coherent case involving a registered synthetic product label.

This separation matters. The model helps interpret the message, but the local rules determine when there is enough supported information for a recommendation. If there is doubt, a person reviews the case.

## What we learned while building it

Our red-team tests found an important mistake in the early versions. The parser could mistake a customer complaint for part of the product name. A description such as "Aurora Desk Lamp toxic with warm light" could be treated as harmless text.

We replaced that open-ended assumption with a small, closed list of known demo product names. The full name has to match. An unknown name or an unexpected addition goes to Human Review, even if the model says there is no defect.

This works for a controlled demonstration. A real store would need a trusted catalog and order database before using these recommendations in daily operations.

## Demo and project links

- **Current simulated demo:** https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v4/clocked-return-lab-current-demo.webm
- **Earlier demonstration with real Clocked calls:** https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm
- **Source code:** https://github.com/Cho3en/clocked-returns-refund-autopilot
- **Quick guide for judges:** https://github.com/Cho3en/clocked-returns-refund-autopilot/blob/main/JUDGES_START_HERE.md

The current recording shows three made-up requests. A clean, unused return receives a provisional Approve recommendation. A reported defect goes to Human Review. An unused item outside the example 30-day window receives a provisional Decline recommendation.

That video was recorded from commit 0c16879, after the product-identity and form-initialization changes. It uses no real Clocked calls. The earlier live recording shows an older version and cannot validate the current safeguards.

## Verification

The latest merged code passed **918 automated tests**. These include the original regression suite, 272 catalog-boundary tests and five independent reviewer test blocks covering 558 more scenario evaluations.

Separately, we ran **354 synthetic HTTP adversarial cases**, **20 browser and security assertions**, and interface checks. GitHub Actions passed the normal automated tests, TypeScript check, lint and production build on the final main commit.

These are useful engineering checks. They do not prove that the current code works correctly with live provider responses, real customer identities or merchant data. We have not completed current-version paid provider validation, credential rotation confirmation or provider-enforced cost controls.

## Suggested award categories

- Best Overall App
- Best Use of Decide, Extract, or Fill
- Best Use of Protect, Guard, or Inspect

We have not integrated Verify, Compare or Rerank and should not select those categories.

People's Choice is separate. It requires an eligible LinkedIn post and its URL in the official entry before the deadline.

## Submission checklist

1. Confirm personal eligibility and payout requirements privately with the organizer.
2. Enter the actual participant's name, email, GitHub handle and other required details into the official form. Do not add private information to this repository.
3. Include the public repository, current simulated video, project overview and relevant categories.
4. Save the official entry while signed in and verify that it appears in the account.
5. Keep the required public links available for judging.

The announced deadline is **November 10, 2026, at 11:59 p.m. Eastern** (**November 11 at 05:59 in Zagreb**). A GitHub repository by itself is not a submitted entry.