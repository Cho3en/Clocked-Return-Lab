# Historical records

Everything in this folder is kept for provenance. Each file describes an
earlier build of Clocked Return Lab and its state at the time of writing.

- These reports are historical. They are not a description of the current
  release.
- Several findings listed here were fixed later. Others were accepted as known
  limitations and are listed in the current README.
- Reports are left unedited below their banner. Nobody pretends that a
  previously reported failure never happened.
- For the current state, read [the test report](../FINAL_RELEASE_AUDIT.md) and
  the "What has been tested" section of the README.

| File | What it records |
|---|---|
| `AUDIT.md` | First security and correctness review. |
| `AUDIT_ROUND2.md` | Second adversarial review, including a note about development dependency advisories. |
| `AUDIT_UI_REDTEAM_R3.md` | Interface and API red-team round. |
| `LIVE_VALIDATION_PREPARED.md` | Preparation notes for capped live Clocked validation. The credential exposure mentioned there was handled separately; live mode is now gated in the application. |
| `P0_ACCEPTANCE.md` | Case-integrity and abstention work. |
| `ROUND4_ACCEPTANCE.md` | Release acceptance criteria from an earlier round. |
| `VIBE_REMEDIATION_REPORT.md` | Remediation notes from an earlier review, including an example of an unsafe approval the current rules reject. |
| `VIBE_REMEDIATION_MATRIX.md` | Finding-by-finding remediation matrix from that review. |

Two points that reviewers commonly ask about:

1. Clocked API key rotation cannot be proven from inside this repository. Only
   the account owner can confirm or revoke a key in the Clocked dashboard.
   The application refuses live calls unless the operator attests that rotation
   happened and that a small hard spend cap exists upstream.
2. The current release does not run paid Clocked calls. The narrated demo uses
   local rules, and the older live recording shows an earlier build. The
   integration code is reviewed and tested with mocked provider responses.
