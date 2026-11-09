# Clocked Return Lab

A small returns triage tool built for the Clocked Build Challenge, October 21 to November 10, 2026.

Reading return emails takes time, especially when customers leave out dates, mention several orders or report a problem that needs special handling. Clocked Return Lab pulls out the relevant claims, shows where they came from and suggests what a support agent should look at next.

Each case receives one of three recommendations: **Approve, Human Review or Decline**. These are suggestions only. The app does not send emails, issue refunds, collect payments or change orders.

**[Watch the current demo (three simulated cases)](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v5/clocked-return-lab-current-demo.webm)**

**[Watch the earlier demo with real Clocked API calls](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm)**

**[Judging guide](JUDGES_START_HERE.md)** | **[Entry form copy](ENTRY_FORM_COPY.md)** | **[Submission details](SUBMISSION.md)** | **[Security review](VIBE_REMEDIATION_REPORT.md)**

The current demo was recorded from commit de454ca after the latest product identity and input handling fixes. It uses three synthetic cases and makes no paid Clocked calls. The historical live demo shows an earlier version, before the current safety checks were added. It should not be taken as validation of the current live integration.

## What the app does

A support agent can paste a request, or choose one of three sample messages. The app displays a recommendation, the fields it recognized, the relevant passages from the customer's text and the checks that still need attention.

It takes a conservative approach to unclear cases. During testing, we found that customer complaints could be hidden inside what looked like a product name. The current version only allows an Approve or Decline recommendation when the complete name matches a known **synthetic demo product**. Unknown names, extra descriptions and potential complaints go to Human Review.

That product list is a controlled test fixture, not a merchant catalog. Matching a name does not prove the order exists, that the customer owns it or that a refund is legally permitted.

The latest merged version has passed **918 automated tests**, **354 additional HTTP adversarial checks** and **20 security and browser checks**. The GitHub workflow also passed on main. These results support the tested prototype, not every possible input or a production deployment.

![Return analysis example](assets/approved.png)

## Run it locally

You need Node.js 22 and npm.

1. Open this repository and run **npm ci**.
2. Start the app with **npm run dev**.
3. Open http://localhost:3000.
4. Leave **Demo fixtures** selected to try the three example cases without credentials.
5. To check the code, run **npm test**, **npm run typecheck**, **npm run lint** and **npm run build**.

The demo does not require a Clocked account. Please use made-up customer information. Its local masking rules are not suitable for real personal data.

The live integration is separate. It requires a server-side CLOCKED_API_KEY in .env.local and a different, randomly generated RETURNLAB_ACCESS_TOKEN with at least 32 characters. Copy .env.example first. Do not commit either secret. Enter only the access token in the browser, never the provider key. Live calls can incur charges.

On Windows PowerShell, use **npm.cmd** if running npm directly is blocked by execution policy. If an inherited npm_config_allow_scripts setting causes an EALLOWSCRIPTS error, remove that setting only from your current shell session.

## How Clocked fits in

The server integrates the official JavaScript Clocked SDK. Each stage has a specific purpose:

1. **Protect** masks personal information before other model analysis. The app also applies a local scrub for common patterns. Neither method guarantees perfect anonymization.
2. **Guard** checks the protected message for prompt injection. If the result is risky, unclear or unavailable, the case goes to Human Review without proceeding to Extract or Decide.
3. **Extract** returns customer-stated fields such as order number, product, delivery date and refund request, along with evidence spans. Uncertain or mismatched spans cannot support an automatic recommendation.
4. **Decide** supplies typed probability judgments about intent, item condition and possible defects. The probabilities apply to individual questions, not to an overall chance of refund approval.
5. **Local policy** checks the evidence for a single coherent order, a valid delivery date, an active refund request, condition and possible exceptions. Approve and Decline also require an exact match to a registered synthetic product label. When something important is missing, the result is Human Review.

The example return window is **30 days**. It is a sample rule for testing, not a real store policy or legal advice. Warranty, safety and consumer-rights issues need human assessment.

Official documentation: https://clocked.rezolve.ai/docs

SDK: https://www.npmjs.com/package/clocked-sdk

Challenge: https://clocked.rezolve.ai/challenge

## What has been tested

- 918 automated synthetic or mocked tests, including five independently designed reviewer test blocks that cover 558 scenario evaluations.
- 354 HTTP adversarial checks, performed separately from the normal GitHub workflow.
- 20 browser and security assertions, plus responsive interface and browser smoke checks.
- GitHub Actions on the final main branch, including tests, TypeScript, lint and production build.

You can rerun the HTTP and browser checks against a local production server. Set RETURNLAB_URL to that server's address, then run **npm run redteam**, **npm run redteam:mutation**, **npm run redteam:ui**, **npm run redteam:heldout**, **npm run security:audit**, **npm run ui:audit** and **npm run smoke**.

The published demo was made with **npm run record:demo**. That command records three synthetic requests and should not call the paid provider. The separate **npm run record** command is for an older live-provider recording workflow and can incur charges.

## Important limitations

- The app does not verify orders, delivery records or product identities against any merchant system.
- Recommendations are advisory. There is no Shopify, Stripe, email or refund execution integration.
- The synthetic demo uses local heuristics and must not receive real customer data.
- Live mode sends authorized original text to Protect. Protected text then reaches Guard, and only Guard-approved text reaches the later stages. The provider processes data under its own policies.
- The parser is deliberately conservative and mostly designed for English requests. Unfamiliar formats and ambiguous cases may be sent for review.
- Provider probabilities can be wrong. A passing test suite does not establish live model accuracy.
- The live access controls and request quotas are maintained per running server instance. They are not a shared, provider-enforced spending cap. Do not expose the paid endpoint publicly without proper authentication, monitoring and billing limits.
- The final implementation has not been revalidated with live Clocked calls following the safety changes. Credential rotation and provider-side spending protections are still unconfirmed.

## For the hackathon judges

**[Start with the judging guide](JUDGES_START_HERE.md)** or **[use the prepared entry fields](ENTRY_FORM_COPY.md)**.

The repository and video are public, but publishing them does not submit a competition entry. The official entry must be saved through the signed-in challenge website.

Announced deadline: **November 10, 2026 at 11:59 p.m. Eastern**, which is **November 11 at 05:59 in Zagreb**. Check the [official rules](https://clocked.rezolve.ai/build-challenge/rules) for the latest requirements.

For a production service, the next step would be to integrate verified merchant orders and policies, then add proper authentication, durable request limits, human approvals and an audit trail.

Earlier technical reports remain available in [P0_ACCEPTANCE.md](P0_ACCEPTANCE.md), [ROUND4_ACCEPTANCE.md](ROUND4_ACCEPTANCE.md) and [AUDIT.md](AUDIT.md).