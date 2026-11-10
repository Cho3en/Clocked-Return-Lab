# Final test report

**Checked on November 10, 2026.**

This report covers the return-handling code, the user interface, the three demo
examples, API security, browser checks, and reproducibility from a clean clone.

## Result

The local demo passes the checks listed below and is ready to show to judges.
This is not approval to use it for real customer refunds.

The live Clocked integration still needs a fresh test with paid requests. We did
not make those calls during this review, and the application now refuses to make
them without explicit operator attestations.

## Backend and API

We checked that the live pipeline calls Protect and Guard before extracting
details or asking Decide to assess the message. If Guard flags a problem or
cannot return a clear result, the app stops before the remaining calls.

The app checks that extracted details match the source message. It also sends
unclear order details, conflicting dates, product problems and safety concerns
for Human Review.

### Live-mode gate

Paid live analysis is refused unless all of these are present:

- a server-side Clocked API key;
- a separate application access token of at least 32 characters;
- `RETURNLAB_LIVE_ENABLED=YES`;
- `CLOCKED_ROTATED_KEY_CONFIRMED=YES`;
- `CLOCKED_PROVIDER_HARD_CAP_CONFIRMED=YES`;
- `CLOCKED_PROVIDER_HARD_CAP_USD` of 0.05 or lower.

The check runs before a Clocked client is created, so a blocked request makes no
provider call. The response is a generic 503 that does not disclose which value
is missing. Route-level tests cover a missing token (401), a disabled gate with a
valid token (503), an unconfirmed rotation, an absent cap, a cap above the
limit and a missing key.

The server also has request validation, size limits, and local rate limits. It
does not have access to a payment system or an endpoint that issues refunds.

## Refund language

Intent classification, demo extraction and statement coverage now read from one
phrase table in `lib/refund-intent.ts`. Ordinary requests are recognized
consistently:

`I would like a refund`, `I'd like a refund`, `We would like a refund`,
`I am requesting a refund`, `I request a refund`, `Please give me a refund`,
`Please send me a refund`, `Refund please`, `Can you refund me?`,
`Could you please refund me?`, `I want my money back`, `I need a refund`,
`I would like to get a refund`, `I would like to receive a refund`,
`I want to send it back for a refund`.

Safety rules are unchanged. Recognizing a request does not authorize a refund.
Withdrawn and quoted requests, return-only requests, questions about policy,
defects, hazards, billing problems, unknown products, missing dates and
conflicting dates still go to Human Review or Decline.

A bare "but" is no longer counted as a complaint by itself. Explicit complaint
wording still is, and any clause the coverage grammar does not recognize still
abstains, so linking two harmless sentences with "but" no longer adds a false
alarm on top of that check.

The grammar stays deliberately narrow. Wider paraphrases that it does not
recognize, such as "Kindly reimburse me for this", still go to Human Review.
That is a coverage decision, not a safety failure.

## Frontend and user journey

We ran all three built-in examples: Clear return, Defective item and Outside
window. Each returned the expected recommendation.

We also checked that a user can change an input without an old result replacing
the new one, open the evidence details, navigate the sections and use the page
on narrow screens.

The interface was tested at widths of 320, 360, 390, 768, 1024 and 1440 pixels.
There was no horizontal overflow and no browser JavaScript exception. The mobile header now occupies about 69 pixels at 320 pixels instead of the
earlier heavy multi-row block. Every visible control, including the small Clear
action inside the message card, measures at least 44 pixels. The UI audit now
includes those controls in its touch-target check.

The five public screenshots were recaptured from this build on November 10,
2026, using `scripts/capture-release-assets.mjs`.

## Test results

Developer checkout and clean clone produced the same results.

| Check | Result |
|---|---|
| TypeScript | Passed |
| ESLint | Passed |
| Production build | Passed, Next.js 16.4.5 |
| Unit and regression tests | 971 passed in 12 files |
| Browser smoke test | Passed, including the live-disabled path |
| UI audit | No reported issues |
| Security checks | 22 passed |
| UI adversarial cases | 32 passed, 0 unsafe decisions |
| Independent HTTP adversarial cases | 32 passed |
| Mutation cases | 76 passed |
| Held-out HTTP cases | 42 passed |
| Fresh adversarial batch written after the fixes | 38 cases, no unsafe result |
| Browser journey checks at 320, 390, 768, 1024 and 1440 | 40 checks passed |
| Offline Clocked pipeline harness | 2 cases, both strict matches, 8 mocked stage calls, 0 USD |
| Production dependency audit | No vulnerabilities reported |
| Full dependency audit | 7 moderate advisories, development dependencies only |

The fresh batch includes cracked-on-arrival claims, sparking and fume reports,
refund-or-exchange ambiguity, two orders, contradictory dates, future dates,
unknown products, opened items, missing delivery dates, quoted old requests,
prompt injection, duplicate charges, negated requests, negated hazards and
transport abuse cases. None produced an unsafe Approve or Decline.

A labelled request line (`Request: I would like a refund`) now reads from the
same phrase table as a bare sentence. Before that fix the same wording was
accepted in the message body and rejected in the field layout.

## Clean clone

A separate clone of the branch was created in a temporary folder with no
`.env.local`, then installed with `npm ci`. TypeScript, ESLint, the 971 tests,
the production build, the browser smoke test, the UI audit, the 22 security
checks, all four adversarial suites, the fresh batch and the offline pipeline
harness passed. Live mode answered 503 "not configured" without contacting
Clocked, and `scripts/validate-clocked-budgeted.mjs --live` refused to run and
reported `requestsMade: 0`.

Earlier versions failed these checks in a clean clone because the security
script expected a 401 that only appeared when a private token was configured.
The script now distinguishes a disabled live mode from an unauthorized request
and fails on any other state.

## Video

The narrated video is about 107 seconds long. It records the real interface and
shows all three possible recommendations. The recording made four demo requests
and no live Clocked requests. Browser capture reported no JavaScript errors.

The video was narrated with a synthetic English voice. The source audio and
working files stay on the development machine and are not part of the
repository.

The video was recorded after the copy refresh, but the `demo-v6` tag points at an
earlier commit. The tag has not been moved. See
[RELEASE_NOTES_DEMO_V7.md](RELEASE_NOTES_DEMO_V7.md) for the release proposal.

## GitHub cleanup

The README, judges' guide, submission text and screenshots were updated for the
current design. Older audit reports stay in `docs/archive` with a banner and an
index that explain what is historical, and the README no longer links directly
into that folder. Obsolete video recording scripts were removed from the current
tree earlier, but their history remains in Git.

Not changed, because they need the repository owner:

- no licence was chosen;
- no GitHub topics or homepage were set;
- the package name still reads `clocked-returns-refund-autopilot`;
- no release was published for this commit;
- the official challenge entry has not been submitted.

## Before using this beyond a demo

We would need to test the current Clocked integration with an approved key and a
confirmed cap, connect actual order and product records, review the relevant
consumer rights, and build proper authentication, shared rate limits, data
retention rules and spending controls.

The challenge entry also needs to be submitted through the official website. A
public repository and demo release do not count as a submitted entry.
