# Final test report

**Checked on November 9, 2026.**

This report covers the return-handling code, the user interface, the three demo examples, API security, and the published video.

## Result

The local demo passed the checks listed below and is ready to show to judges. This is not approval to use it for real customer refunds.

The live Clocked integration still needs a fresh test with paid requests. We did not make those calls during this review.

## Backend and API

We checked that the live pipeline calls Protect and Guard before extracting details or asking Decide to assess the message. If Guard flags a problem or cannot return a clear result, the app stops before the remaining calls.

The app checks that extracted details match the source message. It also sends unclear order details, conflicting dates, product problems, and safety concerns for Human Review.

The server has request validation, size limits, a private access token for live mode, and local rate limits. It does not have access to a payment system or an endpoint that issues refunds.

Security tests covered invalid requests, unauthorized live access, response headers, and browser script protections.

## Frontend and user journey

We ran all three built-in examples: Clear return, Defective item, and Outside window. Each returned the expected recommendation.

We also checked that a user can change an input without an old result replacing the new one, open the evidence details, navigate the sections, and use the page on narrow screens.

The interface was tested at widths of 320, 360, 390, 768, 1024, and 1440 pixels. We found no horizontal overflow or browser JavaScript exceptions in those runs.

## Test results

| Check | Result |
|---|---|
| TypeScript | Passed |
| ESLint | Passed |
| Production build | Passed |
| Unit tests | 918 passed |
| Browser smoke test | Passed |
| UI audit | No reported failures |
| Security tests | 20 passed |
| UI adversarial cases | 32 passed |
| Independent HTTP adversarial cases | 32 passed |
| Mutation cases | 76 passed |
| Held-out HTTP cases | 42 passed |
| Production dependency audit | No vulnerabilities reported |

These checks use synthetic data and negative authentication tests. They are not a substitute for testing the current live Clocked service.

## Video

The narrated video is about 107 seconds long. It records the real interface and shows all three possible recommendations. The recording made four demo requests and no live Clocked requests. Browser capture reported no JavaScript errors.

The video was narrated with a synthetic English voice. The files used to assemble it are kept on the development PC.

## GitHub cleanup

The README, judging guide, submission text, and screenshots were updated for the current design. Older audit reports were moved into `docs/archive` so they are still available without taking over the repository's main page. Obsolete video recording scripts were removed from the current tree, but their history remains in Git.

## Before using this beyond a demo

We would need to test the current Clocked integration, connect actual order and product records, review the relevant consumer rights, and build proper authentication, shared rate limits, data retention rules, and spending controls.

The challenge entry also needs to be submitted through the official website. A public repository and demo release do not count as a submitted entry.
