# VIBE remediation matrix  -  original 11 failing tests

**Baseline:** original 77-test independent audit from commit dbb00f4 against app commit e2e4e2d.
**Updated suite:** tests/vibe-redteam-audit.test.ts (revised without modifying the original audit branch).
**Additional regression:** tests/vibe-remediation-heldout.test.ts.

| Item | Original failure/root cause | Remediation or expectation | Verification |
|---|---|---|---|
| Day 30 boundary | Input omitted required product evidence, so conservative Review was correct | Add a complete synthetic order/product record; exactly 30 days -> advisory Approve | Corrected VIBE test and existing policy boundary tests |
| Day 31 boundary | Same incomplete product fixture | Add product evidence; day 31 -> advisory Decline | Corrected VIBE test and existing policy boundary tests |
| Contradictory condition fixture | Mocked live test extracted a string not present in the message | Make evidence source-aligned with the supplied condition; do not loosen policy | Corrected VIBE test |
| Unicode offset fixture | Fixture used wrong code-point offset for a leading emoji and omitted proper protected text | Use exact code-point offsets; preserve JS UTF-16 conversion behavior | Corrected VIBE test and independent Unicode product tests |
| Return-only intent | Current return-without-refund mistaken for withdrawn refund | Classify as return-only while retaining Human Review for monetary refund authorization | Corrected VIBE and held-out tests |
| Swollen battery hazard | Named safety signal missed common phrasing | Expand hazard detector for active swelling/bulging/leakage, retain negation handling and fail-closed Review | Named-signal and mocked-live red-team tests |
| Emoji/Unicode product | Product parser only recognized ASCII; conservative Review | Accept Unicode product span without losing offset fidelity; enforce complaint-in-product guard | Original audit, held-out Unicode tests and four new safety regressions |
| Long padding | Unknown sentences deliberately prevent automatic decision | Preserve Human Review; assertion documents uncertainty instead of requiring Approve | Corrected VIBE expectation |
| HTML entities | Encoded markup does not imply a verified case | Preserve conservative Review; avoid unsafe decoding-based approval | Corrected VIBE expectation |
| Markdown content | Formatting need not be trusted data | Preserve Review unless separately normalized with safeguards | Corrected VIBE expectation |
| Notice assertion | Test was sensitive to letter case/exact wording, not actual policy contract | Assert case-insensitive notice meaning and explicit no-order-verification disclaimer | Corrected VIBE test |

**Important:** This table groups failures by the independently reproduced underlying categories. It does not assign one unique functional bug to every failing assertion.

## Additional defect discovered after Mistral's work

Broadening the product-name grammar to support Unicode allowed product phrases with embedded complaints to match a safe order sentence. Four verified synthetic cases received an **unsafe Approve**, including:
- "Aurora Lamp shorting out"
- "Aurora Lamp with exposed wires"
- "Aurora Lamp intermittently shorts"
- "Aurora Lamp stopped functioning"

Added targeted tests covering these cases and related vocabulary. A named complaint predicate now prevents those product strings from bypassing the unclassified-statement gate. This is a safety improvement, not proof that every possible complaint is recognized.

## Acceptance criteria

- All existing tests plus the corrected VIBE and post-Mistral held-out suites pass.
- Old and independent HTTP adversarial suites report **zero unsafe Approve/Decline** cases.
- Typecheck, ESLint, production build, browser UI/smoke and HTTP security tests pass.
- Private configuration remains ignored; no credentials or payment data enter the pull request.
- Any future changes to parsers or scope rules require novel adversarial tests, including benign controls to prevent always-Review behavior.
