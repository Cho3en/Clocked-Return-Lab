# Verification

The results below were recorded on November 10, 2026, using synthetic demo requests and mocked provider responses. They do not establish production accuracy or validate paid Clocked calls.

## Run locally

Requires Node.js 22 or later.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

With the application running at `http://127.0.0.1:3000`, set `RETURNLAB_URL` to that address and run:

```bash
npm run smoke
npm run ui:audit
npm run security:audit
npm run redteam
npm run redteam:mutation
npm run redteam:ui
npm run redteam:heldout
npm audit --omit=dev
```

## Tested behavior

| Check | Result |
|---|---|
| TypeScript, lint and production build | Passed |
| Unit and regression tests | 971 passed across 12 test files |
| Browser smoke | Passed |
| UI audit | No reported issues |
| Security checks | 22 passed |
| Independent HTTP cases | 32 passed |
| Mutation cases | 76 passed |
| UI adversarial cases | 32 passed |
| Held-out HTTP cases | 42 passed |
| Additional adversarial batch | 38 cases, no unsafe recommendation observed |
| Browser journey | 40 checks at five viewport widths |
| Offline Clocked integration harness | 8 mocked calls, no billed provider usage |
| Production dependency audit | No reported vulnerabilities |

A separate clean clone was tested using `npm ci` without `.env.local`. The demo worked and live requests were refused with HTTP 503.

## Scope and limitations

The demo uses made-up customer messages and an example 30-day return policy. It does not check merchant orders, perform refunds or send customer messages.

The server refuses live mode without an access token, explicit enablement and operator attestations concerning API-key rotation and an upstream spending limit. Those attestations do not independently verify the provider account. The current live integration has not been revalidated with paid requests.

The tests cover known cases and safety boundaries. They do not guarantee that every possible customer request will be handled correctly.
