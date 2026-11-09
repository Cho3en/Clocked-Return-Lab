# Clocked Return Lab — Returns & Refund Autopilot

An evidence-led return triage dashboard created for the **Clocked Build Challenge, October 21–November 10, 2026**.

Transforms an incoming customer request into a **recommended** route: Approve / Human Review / Decline. This is a decision-support prototype — it cannot issue refunds, send emails, or change orders.

**[Watch the current UI — three-case simulated walkthrough](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v3/clocked-return-lab-post-p0-demo.webm)**

**[Watch the historical real Clocked API demonstration (50 seconds)](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v1/clocked-return-lab-live-demo.webm)**

*The demo-v3 video was freshly recorded from the merged P0 source commit d85ff5a using deterministic synthetic fixtures, with zero paid API calls. It depicts three built-in cases; the broader hazard safeguards are verified by synthetic tests, not by the recording. The older video exercised actual Clocked provider calls before the latest case-integrity and UI improvements. Do not confuse either video's evidence with the other.*

**[Judges: start here](JUDGES_START_HERE.md)** · **[Entry form copy](ENTRY_FORM_COPY.md)** · **[Submission summary](SUBMISSION.md)** · **[VIBE remediation report](VIBE_REMEDIATION_REPORT.md)** · **[Round 4 acceptance](ROUND4_ACCEPTANCE.md)**

**Current release status:** The reviewed VIBE safety/Unicode remediation is merged, with 641 automated tests (including 179 P0 product-hazard regression tests and unseen product-qualifier controls; mocked-Clocked, not live-provider, evidence) and independent synthetic browser/HTTP release gates passed locally. A subsequent independent audit found and this branch fixes a P0 product-description hazard bypass (hazard complaints embedded in the product name could approve); see JUDGES_START_HERE.md. Current screenshots and a separate simulated three-case video are available. The original live-provider video is historical; the live paid endpoint must not be exposed publicly without rotated credentials, durable authentication and provider-enforced spending controls.

Earlier engineering records: **[P0 safety milestone](P0_ACCEPTANCE.md)** · **[Initial audit](AUDIT.md)**.

![Demo result dashboard](assets/approved.png)

The three screenshots in **assets/** document the different lanes. Start the app with **npm run dev**, then run **npm run capture** (default http://localhost:3000) to repeat browser-backed checks. Set **RETURNLAB_URL** to override the base URL.

## Quick start

Requires Node.js 20.9+ and npm.

1. Run **npm install** in this directory.
2. Copy **.env.example** to **.env.local**, and set **CLOCKED_API_KEY**. Create a distinct 32+ character **RETURNLAB_ACCESS_TOKEN** using a local cryptographically random generator. Never commit or share either key.
3. Run **npm run dev** and open http://localhost:3000.
4. Choose **Demo fixtures** to test without any key, or **Clocked live**. In live mode, copy only RETURNLAB_ACCESS_TOKEN from your own .env.local into the password field. It is retained in browser memory only, not localStorage. The Clocked API key remains exclusively server-side.
5. Check with **npm test**, **npm run lint**, **npm run typecheck**, and **npm run build**. With a local production server running, use **npm run smoke**, **npm run ui:audit**, **npm run security:audit**, **npm run redteam**, **npm run redteam:mutation**, **npm run redteam:ui**, and **npm run redteam:heldout** (set `RETURNLAB_URL` to its local address). **npm run record** costs live Clocked calls; do not run with an unrotated or exposed key.

On Windows PowerShell, if npm.ps1 is blocked, use **npm.cmd** instead. If an inherited npm_config_allow_scripts environment variable causes EALLOWSCRIPTS, unset it **for the current PowerShell process only**; do not disable global installation safeguards.

## Official Clocked integration

The live flow uses the official JavaScript **clocked-sdk** package (server-side only):

1. Protect: clocked.pii — returns anonymized_text with broader high-risk entity detection. A local pattern scrub adds defense in depth. Neither is guaranteed full anonymization.
2. Guard: clocked.injection — screens the protected text before Extract or Decide. Dangerous, ambiguous or failed Guard results stop further model calls and route to Review.
3. Extract: clocked.extract — exact text and Unicode code-point offsets, normalized to JavaScript UTF-16 indices before display. Unaligned or low-confidence evidence cannot approve or decline.
4. Decide: clocked.decide — typed noul judgments about intent, condition and exceptions. Scores between 0.2 and 0.8 remain Unknown; each P(Yes) refers to that question only.
5. Deterministic case-scoped policy engine: combines **customer-reported**, source-aligned claims with one-order/one-delivery-date checks, current refund intent, exception-first review, and a **fail-closed statement coverage gate**. A relative clause, unverified prepositional qualifier, event or finite-verb-like product suffix embedded in the product field, a source-aligned affirmative extracted issue phrase, or any unclassified statement triggers Review even when Clocked Decide confidently answers “no defect,” and such a case can never become an automatic Decline. No merchant order has been independently verified.

The original proposal's paths at api.clocked.rezolve.ai were **unverified placeholders**, not the integration.

Documentation: https://clocked.rezolve.ai/docs
SDK: https://www.npmjs.com/package/clocked-sdk
Challenge: https://clocked.rezolve.ai/challenge

## Boundaries and safety

- No Shopify, Stripe, payment, refund, email, or order platform integration. No automatic actions.
- **SIMULATED** demo mode uses deterministic heuristics. Its basic regex masking is **not safe for real personal data**. Use synthetic messages only.
- Live mode sends original authorized text to Clocked Protect and protected text to Guard. Only Guard-approved text reaches Extract and Decide. The app does not intentionally persist requests or log customer text, but Clocked processes the data under its own policies. The private **access token** is supplied by the browser (not persisted); the **Clocked API key** stays server-side.
- Decision scope: **one explicit, internally consistent order and one delivery date per email**. Multiple orders, conflicting dates, alternative/withdrawn intent and safety or consumer-rights issues go to Human Review. The rules are intentionally English-oriented and conservative.
- Sample 30-day rule is not a merchant's policy or a statement of legal rights. Defects, warranties, unclear evidence and statutory-rights exceptions always escalate to human review.
- All delivery dates, product names and order references are customer-reported, not verified carrier/order data. The displayed routes are **advisory only**. Connect trusted order records, store-specific policies and human review before real use. Live mode ignores browser-supplied evaluation dates and uses the server’s Europe/Zagreb date.
- Model probabilities can be uncalibrated or wrong and are not fraud scores.
- Incoming JSON streams are limited to 15KB **before parsing**, including chunked requests. HTTP errors are sanitized and live authentication fails closed.
- Live API requires a separate 32+ character access token, maximum 8 live requests per 15 minutes, 30 per UTC day and two active requests per process. These are **in-memory, per-instance safeguards** and not distributed enforcement. Do not deploy publicly without durable shared quotas, a proper user auth system, monitoring and abuse controls.

## Reproducible current simulated demonstration

From the running local app, run **npm run record:demo** to record the three example routes without any provider credentials or billable Clocked calls. The script refuses a recording containing anything other than exactly three demo-mode API requests. It creates an ignored local WebM in assets/; the judge-facing copy is published as the **demo-v3** GitHub Release asset. Use **npm run capture** to refresh current screenshots.

## Historical real-provider demonstration

The older live-API video is generated with `npm run record` after starting a local server. It invokes real Clocked calls on three synthetic examples (eligible, defective, outside window), while reading the private access token from the ignored `.env.local` file. Never publish the configuration file or include live keys in recordings. The script records a local WebM video; the public release asset is at the link above.

## Hackathon submission

**[Submission-ready copy](ENTRY_FORM_COPY.md)** lists the official form fields and URLs; **[one-page judging guide](JUDGES_START_HERE.md)** prioritizes reproducibility. The project is not officially submitted merely because GitHub is public: the signed-in Clocked entry form must be saved and verified.

Announced deadline: **November 10, 2026 at 11:59 p.m. Eastern, corresponding to November 11 at 05:59 in Zagreb.** Submit a public repository, live demo link or short video, project details and eligible entrant information. Verify the official rules at https://clocked.rezolve.ai/build-challenge/rules before submitting.

## Future production requirements

Verified orders and delivery events, per-merchant policies, authentication, idempotent human-approved action execution, audit trails, permissioned integrations, traffic limits and secure deployment. Deliberately out of MVP scope.
