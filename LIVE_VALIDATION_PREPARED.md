# Clocked live validation — safe preflight and reproducible run

Date: November 9, 2026

## Current status

**PREPARED — ZERO REAL PROVIDER CALLS MADE.**

This branch adds scripts/validate-clocked-budgeted.mjs, a separate validation of the actual triageWithClocked pipeline. Default execution uses synthetic offline mocks and makes no network calls. This branch does not modify PR #1 or the public demo.

Live mode is blocked until both the previously exposed Clocked key is rotated and a provider-enforced hard spending cap is confirmed. Client-side accounting alone is insufficient: individual requests can incur charges before response metadata is available.

The primary local .env.local was last modified before the known exposure checkpoint. Key rotation and a provider-side cap could not be independently verified, so no real calls were made.

## Offline rehearsal — no credentials and no cost

From the repository root with Node.js dependencies installed:

    node scripts/validate-clocked-budgeted.mjs

Expected: eligible-unused → Approve, battery-hazard → Review. Eight simulated SDK operations, zero cost.

## Live prerequisites

1. Revoke the exposed CLOCKED_API_KEY in the Clocked account and create a fresh key. Update the ignored .env.local locally. Do not share or print it.
2. Verify an **enforced account-level spending cap of at most USD 0.05**, as well as remaining credits/allowance. If the provider cannot enforce a hard dollar cap, do not run this as a strictly budgeted test.
3. Only once both steps are true, on Windows PowerShell configure the following session-only attestations and run:

    $env:CLOCKED_ROTATED_KEY_CONFIRMED = "YES"
    $env:CLOCKED_PROVIDER_HARD_CAP_CONFIRMED = "YES"
    $env:CLOCKED_PROVIDER_HARD_CAP_USD = "0.05"
    node scripts/validate-clocked-budgeted.mjs --live

The script also verifies the local key file was modified after its prior exposure checkpoint. This is only a supporting heuristic, not cryptographic proof that the credential was rotated. The operator attestations must be truthful.

## Budget and safety limits

| Control | Limit |
| --- | --- |
| Cases | Two fixed, synthetic cases |
| Maximum SDK endpoint operations | Eight total |
| SDK attempts per endpoint | One, no retries |
| Provider calls concurrently | None — serialized for post-call cost checks |
| Timeout | 30 seconds per attempt |
| Client-side post-response cost threshold | USD 0.05 |
| Provider-side hard spending limit | Must exist and be confirmed before live mode |
| Billing evidence | SDK credits, costUsd, costBasis and attempts |
| Credentials or customer information printed | None |

The script stops if it sees missing cost metadata, overage/mixed billing basis, a non-single attempt, or cumulative cost above threshold. These controls cannot undo the cost of a request already processed; therefore the provider-enforced account cap is necessary. SDK costUsd can be a reference price (not actual charged cash) for a trial plan.

## Interpretation

The validator uses the real app's Protect → Guard → Extract and Decide → deterministic policy pipeline. It evaluates two synthetic, mutually different scenarios and reports conservative or unsafe dispositions.

It does not validate actual merchant-order records, consumer rights, the accuracy of every future model result, or production-grade cost controls. No refunds, payments, emails, or order changes are performed.

## PR state

PR #1 passed source and local tests but no CI is configured. GitHub rejected self-approval because the authenticated account is the PR author. A review with comments was posted. PR #1 remains open and unchanged. This separate branch is a future live-validation tool, not a production deployment.
