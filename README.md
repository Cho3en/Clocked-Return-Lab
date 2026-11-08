# Clocked Return Lab — Returns & Refund Autopilot

An evidence-led return triage dashboard created for the **Clocked Build Challenge, October 21–November 10, 2026**.

Transforms an incoming customer request into a **recommended** route: Approve / Human Review / Decline. This is a decision-support prototype — it cannot issue refunds, send emails, or change orders.

**[Watch the real Clocked API demonstration (50 seconds)](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm)**

**[Submission summary and technical judging notes](SUBMISSION.md)** · **[Independent audit, fixes, and remaining boundaries](AUDIT.md)**

![Demo result dashboard](assets/approved.png)

The three screenshots in **assets/** document the different lanes. Start the app with **npm run dev**, then run **npm run capture** (default http://localhost:3000) to repeat browser-backed checks. Set **RETURNLAB_URL** to override the base URL.

## Quick start

Requires Node.js 20.9+ and npm.

1. Run **npm install** in this directory.
2. Copy **.env.example** to **.env.local**, and set **CLOCKED_API_KEY**. Create a distinct 32+ character **RETURNLAB_ACCESS_TOKEN** using a local cryptographically random generator. Never commit or share either key.
3. Run **npm run dev** and open http://localhost:3000.
4. Choose **Demo fixtures** to test without any key, or **Clocked live**. In live mode, copy only RETURNLAB_ACCESS_TOKEN from your own .env.local into the password field. It is retained in browser memory only, not localStorage. The Clocked API key remains exclusively server-side.
5. Check with **npm test**, **npm run lint**, **npm run typecheck**, and **npm run build**. With a local server running, use **npm run smoke** to reproduce browser regressions. Use **npm run record** to record the real synthetic Clocked demo.

On Windows PowerShell, if npm.ps1 is blocked, use **npm.cmd** instead. If an inherited npm_config_allow_scripts environment variable causes EALLOWSCRIPTS, unset it **for the current PowerShell process only**; do not disable global installation safeguards.

## Official Clocked integration

The live flow uses the official JavaScript **clocked-sdk** package (server-side only):

1. Protect: clocked.pii — returns anonymized_text with broader high-risk entity detection. A local pattern scrub adds defense in depth. Neither is guaranteed full anonymization.
2. Guard: clocked.injection — screens the protected text before Extract or Decide. Dangerous, ambiguous or failed Guard results stop further model calls and route to Review.
3. Extract: clocked.extract — exact text and Unicode code-point offsets, normalized to JavaScript UTF-16 indices before display. Unaligned or low-confidence evidence cannot approve or decline.
4. Decide: clocked.decide — typed noul judgments about intent, condition and exceptions. Scores between 0.2 and 0.8 remain Unknown; each P(Yes) refers to that question only.
5. Deterministic policy engine: combines verified dates, fields, and exception checks into a recommendation.

The original proposal's paths at api.clocked.rezolve.ai were **unverified placeholders**, not the integration.

Documentation: https://clocked.rezolve.ai/docs
SDK: https://www.npmjs.com/package/clocked-sdk
Challenge: https://clocked.rezolve.ai/challenge

## Boundaries and safety

- No Shopify, Stripe, payment, refund, email, or order platform integration. No automatic actions.
- **SIMULATED** demo mode uses deterministic heuristics. Its basic regex masking is **not safe for real personal data**. Use synthetic messages only.
- Live mode sends original authorized text to Clocked Protect and protected text to Guard. Only Guard-approved text reaches Extract and Decide. The app does not intentionally persist requests or log customer text, but Clocked processes the data under its own policies. The private **access token** is supplied by the browser (not persisted); the **Clocked API key** stays server-side.
- Sample 30-day rule is not a merchant's policy or a statement of legal rights. Defects, warranties, unclear evidence and statutory-rights exceptions always escalate to human review.
- All delivery dates, product names and order references are customer-reported, not verified carrier/order data. The displayed routes are **advisory only**. Connect trusted order records, store-specific policies and human review before real use. Live mode ignores browser-supplied evaluation dates and uses the server’s Europe/Zagreb date.
- Model probabilities can be uncalibrated or wrong and are not fraud scores.
- Incoming JSON streams are limited to 15KB **before parsing**, including chunked requests. HTTP errors are sanitized and live authentication fails closed.
- Live API requires a separate 32+ character access token, maximum 8 live requests per 15 minutes, 30 per UTC day and two active requests per process. These are **in-memory, per-instance safeguards** and not distributed enforcement. Do not deploy publicly without durable shared quotas, a proper user auth system, monitoring and abuse controls.

## Reproducible live demonstration

The video is generated with `npm run record` after starting a local server. It invokes real Clocked calls on three synthetic examples (eligible, defective, outside window), while reading the private access token from the ignored `.env.local` file. Never publish the configuration file or include live keys in recordings. The script records a local WebM video; the public release asset is at the link above.

## Hackathon submission

Announced deadline: **November 10, 2026 at 11:59 p.m. Eastern, corresponding to November 11 at 05:59 in Zagreb.** Submit a public repository, live demo link or short video, project details and eligible entrant information. Verify the official rules at https://clocked.rezolve.ai/build-challenge/rules before submitting.

## Future production requirements

Verified orders and delivery events, per-merchant policies, authentication, idempotent human-approved action execution, audit trails, permissioned integrations, traffic limits and secure deployment. Deliberately out of MVP scope.
