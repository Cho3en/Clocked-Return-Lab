# P0 Engineering Milestone — Case Integrity and Safe Abstention

Date: November 8, 2026
Scope: P0.1–P0.4 for the Clocked Returns & Refund Autopilot.
Baseline before this work: commit 725491f.
Status: Source fixes and synthetic adversarial validation passed; real Clocked SDK retesting is pending credential rotation. Existing public demo remains pre-P0 footage until a verified replacement is recorded.

## P0.1 — Case identity and evidence binding

Created lib/case-context.ts, introducing a single-case data structure with:
- Deduplicated order references, including repeated identifiers;
- Unique customer-reported ISO delivery dates, including date corrections;
- Current customer-intent classification;
- Escalation signals and identity blockers;
- A linkedOrderId only when a unique, self-consistent case exists.

The policy engine checks that the extracted order and delivery date match the single text-level case. It refuses either Approve or Decline when there are multiple distinct order references, conflicting dates, ambiguous products or identity mismatches. These are *conservative linkage checks*, not reconciliation against a merchant's database. Source-aligned fields and high model probabilities are not independent proof.

## P0.2 — Current intent, not mere keyword presence

Separates: refund, return-only, exchange, support, withdrawn/historical, speculative, ambiguous and none. An approval/decline for the refund workflow requires current affirmative refund intent, extracted request evidence, an affirmative Clocked Decide judgment (or deterministic synthetic demo judgment), and all case/policy safety gates.

Quoted refund language, customer denial, cancellation, exchange/store-credit preference or ambiguous alternative destinations trigger human review. A pure return-only request is not treated as authorization for a refund.

## P0.3 — Exception-first safety routing

Explicit product / order / delivery problem escalation checks handle: defective and damaged goods; overheating, smoke, sparks, melting and electrical injury; wrong variants, color or dimensions; missing hardware or delivery; prior replacement or returned shipment; ownership and shipping-address discrepancies; consumer rights and warranty. If any exception or model concern is present, or Clocked Guard cannot confidently clear a message, final routing is Human Review.

A lexicon cannot identify every possible product fault. These checks improve safety for the tested scenarios but are not a complete substitute for legal review, merchant policy or human judgment.

## P0.4 — Permanent regressions and independent red teams

- tests/p0-regression.test.ts: core red-team decision matrix with normal, old, multi-order, multi-date, quoted, withdrawn, safety and condition cases. Independent failures were added as permanent regression cases.
- tests/pipeline.test.ts: mocked Clocked integration checks now include multi-order attribution, false-negative model issues and withdrawn quotations.
- scripts/redteam-p0.mjs: separate HTTP adversarial corpus, 32 scenarios.
- scripts/redteam-metamorphic.mjs: synthetic mutation pass, 76 scenarios (two baseline cases plus 37 case mutations for each of the two different delivery-age scenarios).
- Existing tests/policy.test.ts and tests/hardening.test.ts remain active.

### Observed results

| Validation | Result |
| --- | --- |
| Initial new P0 regression tests (before fixes) | 17 failing out of 89 total |
| P0 regression suite after fixes (including promoted red-team cases and mocked pipeline cases) | 106 / 106 passing |
| Separate HTTP red-team: first run | 14 failing / 32 |
| Separate HTTP red-team: repaired production build | 32 / 32 passing |
| Independent mutation audit: first run | 28 failing / 76 |
| Independent mutation audit: repaired production build | 76 / 76 passing |
| TypeScript / ESLint / production build | Passed |
| Browser smoke against separate production preview | Passed (normal scenarios, interrupted request, private-token control, mobile, no JS exceptions) |

These are scenario-based checks using synthetic text and mocked Clocked responses; they do NOT imply the entire space of possible customer emails is handled correctly.

## Reproduce with zero paid Clocked calls

1. npm test
2. npm run typecheck
3. npm run lint
4. npm run build
5. Start production app on localhost; for example: npm run start -- -p 3145 -H 127.0.0.1
6. npm run smoke (set RETURNLAB_URL=http://127.0.0.1:3145)
7. npm run redteam
8. npm run redteam:mutation

The HTTP red-team scripts default to port 3145. All provided fixtures are synthetic and use demo mode; do not insert real customer data.

## Remaining limitations and release gates

- **No independent order verification:** the extracted customer-provided order reference, delivery date and condition may be false, mistaken or forged.
- **Conservative, English-oriented interpretation:** unusual paraphrases, mixed languages, aliases, multiple-product orders and novel safety descriptions can be missed or escalated. A finite red-team corpus is not a correctness proof.
- **No financial execution:** all lanes are advisory; no refund, payment, message or store-order update is sent.
- **Live validation:** retest actual Clocked SDK responses with synthetic cases only after a previously exposed key has been revoked/replaced. Mocked integration tests do not establish model accuracy.
- **P1 security:** durable distributed per-user rate/budget controls, data protection, secure deployment headers, session authentication and operational monitoring remain future requirements. The present in-memory quota alone is insufficient for public live access.
- **P1 usability:** simplify the mobile decision journey, clarify human review tasks, add accessibility semantics and distinguish customer claims from verified store facts.
- The existing GitHub demo video documents a pre-P0 version. Replace only after running and inspecting a new verified recording, avoiding any API key exposure.

No one should claim production-grade refund decision safety based on these passing tests. Publish as a transparent hackathon prototype with explicit limitations and no automatic actions.
