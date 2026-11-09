# Clocked Return Lab — final challenge submission

## Public project name
Clocked Return Lab

## One-line pitch
Evidence-first returns triage combining Clocked's structured understanding with conservative policy gates and clear human-review handoffs.

## Problem
Support teams receive unstructured return requests containing dates, order references, vague product names, conflicting claims and occasional safety concerns. Model outputs can sound certain when the actual evidence is weak. First-pass triage should be inspectable and safe to escalate.

## Solution
Clocked Return Lab takes a return message and recommends Approve, Human Review or Decline, showing the exact evidence and supporting policy checks. The live code combines Clocked **Protect** for best-effort PII masking, **Guard** for injection screening, **Extract** for exact source-linked fields and **Decide** for typed assessments. Local rules conservatively determine whether enough information exists to recommend a route.

Cases with ambiguous identity, unsupported product descriptions, contradictory claims, uncertain Guard status or potential statutory and safety concerns stay with a human. The app does not issue refunds, send messages or modify orders.

The narrated demo is deliberately synthetic; it uses local heuristics and zero paid Clocked calls. A historical live recording exists, but predates recent safety and UI changes.

## Audience
Small e-commerce support teams seeking transparent first-review decisions without automating irreversible financial actions.

## Key links
- **Narrated demo:** https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v6/clocked-return-lab-narrated-demo.mp4
- **Public source:** https://github.com/Cho3en/clocked-returns-refund-autopilot
- **Judging guide:** https://github.com/Cho3en/clocked-returns-refund-autopilot/blob/main/JUDGES_START_HERE.md
- **Historical live demonstration (older version):** https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm

## Award categories to consider
Best Overall App; Best Use of Decide / Extract / Fill; Best Use of Protect / Guard / Inspect.

No Verify, Compare or Rerank endpoint is integrated. Do not select those categories.

## Verification and limitations
918 passing unit/regression tests; 20 security checks; responsive browser smoke/UI audit; 32 UI adversarial cases; 32 independent, 76 mutation and 42 held-out HTTP cases. No merchant data, real catalog, order verification, legal determination, actual refund execution or latest-version paid Clocked validation. Provider probabilities are not proof that a customer claim is true.

## Official submission reminder
The owner must enter their participant details and verify eligibility privately, link the demo and public repository, select relevant categories and **save the official entry** at https://clocked.rezolve.ai/challenge before November 10, 2026, 11:59 p.m. Eastern (November 11, 05:59 Zagreb). GitHub release publication does not automatically submit an entry.
