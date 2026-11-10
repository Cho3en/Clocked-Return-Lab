# Clocked Return Lab: Submission overview

## The idea

**Make customer returns easier to review without letting an AI make the final decision.**

Support teams spend time picking through emails that are missing dates, mix up order numbers, or mention problems that don't fit a standard return policy. A quick automated answer is useful only if the agent can see what it was based on.

Clocked Return Lab reads a return request, identifies the important details, and recommends Approve, Human Review, or Decline. It explains the result and lets the agent inspect the words in the original message.

## How I used Clocked

The live integration uses Protect to mask personal information, Guard to screen for prompt injection, Extract to pull out dates and other details, and Decide to assess questions such as whether the customer is asking for a refund or reporting damage.

The app doesn't simply follow those responses. It checks for missing or contradictory information and flags product or safety issues. When the case is unclear, it recommends Human Review.

There is no refund button and no connection to a merchant's payment system. The result is guidance for an agent, not an executed decision.

## Who would use it?

Small online stores and customer support teams that want to spend less time sorting return emails and more time handling the cases that actually need attention.

## Demo and source code

- [Narrated demo](https://github.com/Cho3en/Clocked-Return-Lab/releases/latest/download/clocked-return-lab-narrated-demo.mp4)
- [GitHub repository](https://github.com/Cho3en/Clocked-Return-Lab)
- [Guide for judges](https://github.com/Cho3en/Clocked-Return-Lab/blob/main/JUDGES_START_HERE.md)

The narrated video shows three synthetic requests handled by local demo rules. It does not call Clocked. The SDK integration is available in the source code, but current live-provider behavior has not been validated.

## Testing and limits

The latest version passed 971 unit tests, a production build, browser and mobile checks, 22 security checks, and several synthetic adversarial suites, including a fresh batch written after the last fixes. The repository also verifies from a clean clone with no private configuration.

It hasn't been connected to a real store, and paid Clocked calls haven't been rerun since the recent changes. Live mode refuses to run unless the operator enables it, attests that the API key was rotated, and attests to a hard spending limit of 0.05 USD or less. The demo's 30-day return policy and product list are examples. No refunds, messages, or payments are sent.

## Challenge submission

The project is intended for the Clocked Build Challenge. Depending on the options offered in the form, relevant categories include Best Overall App and the categories covering Protect, Guard, Extract, and Decide.

The official entry still needs to be saved on [the challenge website](https://clocked.rezolve.ai/challenge). Posting the code to GitHub does not submit an entry. The stated deadline is November 10, 2026, at 11:59 p.m. Eastern (November 11 at 05:59 in Zagreb).
