# Clocked Return Lab: Guide for judges

Clocked Return Lab helps a support agent work through a customer return request without losing track of important details. It suggests a next step and shows why it made that suggestion.

## Watch the demo

[Watch the narrated walkthrough](https://github.com/Cho3en/Clocked-Return-Lab/releases/download/demo-v6/clocked-return-lab-narrated-demo.mp4)

The video shows three made-up requests in the real app:

1. An unused item delivered 12 days ago. The example rules suggest Approve.
2. A defective item with missing details. The case goes to Human Review.
3. An unused item reported as delivered 58 days ago. The example 30-day policy suggests Decline.

These are recommendations only. An agent would still need to check the actual order, store policy, and any applicable customer rights.

![Approval recommendation](assets/approved.png)

## Where Clocked fits

The live integration is in [lib/pipeline.ts](lib/pipeline.ts). It calls Clocked through the SDK rather than using a fake response.

| Service | What happens |
|---|---|
| Protect | Personal information is masked before the message is processed further. |
| Guard | The message is screened for prompt injection. If it is risky or uncertain, later calls are stopped. |
| Extract | The app receives structured details and the positions of the corresponding words in the message. |
| Decide | The app receives assessments of refund intent, item condition, and reported problems. |

The app then applies its own checks to decide whether it has enough information to suggest a result. If the facts are unclear, the case is sent for Human Review.

The narrated video uses the local demo, not paid Clocked calls. There is an [older recording of live Clocked usage](https://github.com/Cho3en/Clocked-Return-Lab/releases/tag/demo-v1), but it predates the latest safety changes.

## Run the three examples yourself

```bash
npm ci
npm run dev
```

Open http://localhost:3000, choose **Demo fixtures**, then try each example.

After you run a case, open the panels below the result. They show the original text, order details, request checks, and policy findings. The highlighted words tell you where information came from, not whether the customer is telling the truth.

## What is ready, and what isn't

The synthetic demo passed 971 unit tests, browser checks, 22 security checks, and several sets of adversarial cases.

The app cannot verify real store orders, confirm delivery, issue refunds, or make legal decisions. The current live integration has not been retested with paid Clocked requests since the latest changes, and live mode stays disabled unless the operator specifically enables it with a rotated key and a small hard spending cap.

[README](README.md) | [Submission text](SUBMISSION.md) | [Test report](docs/FINAL_RELEASE_AUDIT.md) | [Challenge rules](https://clocked.rezolve.ai/build-challenge/rules)
