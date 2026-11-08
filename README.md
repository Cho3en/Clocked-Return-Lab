# Clocked Return Lab — Returns & Refund Autopilot

An evidence-led return triage dashboard created for the **Clocked Build Challenge, October 21–November 10, 2026**.

Transforms an incoming customer request into a **recommended** route: Approve / Human Review / Decline. This is a decision-support prototype — it cannot issue refunds, send emails, or change orders.

![Demo result dashboard](assets/approved.png)

The three screenshots in **assets/** document the different lanes. Start the app with **npm run dev**, then run **npm run capture** (default http://localhost:3000) to repeat browser-backed checks. Set **RETURNLAB_URL** to override the base URL.

## Quick start

Requires Node.js 20.9+ and npm.

1. Run **npm install** in this directory.
2. Copy **.env.example** to **.env.local**; set **CLOCKED_API_KEY** there (never commit or expose it).
3. Run **npm run dev** and open http://localhost:3000.
4. Choose **Demo fixtures** to test without a key, or **Clocked live** for real API.
5. Check with **npm test**, **npm run lint**, **npm run typecheck**, and **npm run build**.

On Windows PowerShell, if npm.ps1 is blocked, use **npm.cmd** instead. If an inherited npm_config_allow_scripts environment variable causes EALLOWSCRIPTS, unset it **for the current PowerShell process only**; do not disable global installation safeguards.

## Official Clocked integration

The live flow uses the official JavaScript **clocked-sdk** package (server-side only):

1. Protect: clocked.pii — returns anonymized_text after masking configured PII.
2. Extract: clocked.extract — exact values and source offsets; the UI displays only offsets that exactly match the text.
3. Decide: clocked.decide — typed noul questions about intent, unused condition, and defects. Any returned probability belongs to its specific assessment, not a claim that a refund is safe.
4. Guard: clocked.injection — screens suspicious instructions before route selection.
5. Deterministic policy engine: combines verified dates, fields, and exception checks into a recommendation.

The original proposal's paths at api.clocked.rezolve.ai were **unverified placeholders**, not the integration.

Documentation: https://clocked.rezolve.ai/docs
SDK: https://www.npmjs.com/package/clocked-sdk
Challenge: https://clocked.rezolve.ai/challenge

## Boundaries and safety

- No Shopify, Stripe, payment, refund, email, or order platform integration. No automatic actions.
- **SIMULATED** demo mode uses deterministic heuristics. Its basic regex masking is **not safe for real personal data**. Use synthetic messages only.
- Live mode sends original text to Clocked Protect, and only redacted text to subsequent Clocked endpoints. This app doesn't persist original requests, log customer text, or transmit the key to browsers. Clocked's service handles incoming text under its own policies.
- Sample 30-day rule is not a merchant's policy or a statement of legal rights. Defects, warranties, unclear evidence and statutory-rights exceptions always escalate to human review.
- Customer-reported delivery dates are not verified carrier data. Connect trusted order records and actual store policies before real use.
- Model probabilities can be uncalibrated or wrong and are not fraud scores.
- Requests are size-limited. API errors are sanitized.
- No authentication or rate limiting in the prototype. **Do not expose live Clocked mode publicly without both**, to prevent uncontrolled API expenditure.

## 75-second video outline

1. 0–12s: introduce Protect → Extract → Decide → Policy gates and three-lane routing.
2. 12–30s: eligible sample; show delivery date, unused condition and highlighted evidence. Explain no payment was executed.
3. 30–48s: defective headphones; missing delivery date / defect always requires review.
4. 48–60s: 58-day-old return; explicit date outside the sample policy routes to decline recommendation.
5. 60–75s: switch to live mode **only if** the API key and real calls have been verified; show real masking and model estimates.

## Hackathon submission

Announced deadline: **November 10, 2026 at 11:59 p.m. Eastern, corresponding to November 11 at 05:59 in Zagreb.** Submit a public repository, live demo link or short video, project details and eligible entrant information. Verify the official rules at https://clocked.rezolve.ai/build-challenge/rules before submitting.

## Future production requirements

Verified orders and delivery events, per-merchant policies, authentication, idempotent human-approved action execution, audit trails, permissioned integrations, traffic limits and secure deployment. Deliberately out of MVP scope.
