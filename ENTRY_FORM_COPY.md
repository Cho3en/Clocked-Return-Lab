# Clocked Build Challenge: Entry form answers

These are the answers to copy into the challenge form. The project has not been submitted through the official website yet. Add your name and contact details in the form, not here.

## Project name

Clocked Return Lab

## Short description

A tool that reads customer return requests, checks the details with Clocked, and suggests whether to approve, decline, or ask a person to review the case. Every recommendation comes with reasons.

## Project description

Returns can be surprisingly difficult to handle. A customer might leave out the delivery date, mention two orders, or report a faulty product alongside a simple refund request. A support agent has to work out what happened before deciding what to do.

I built Clocked Return Lab to make that first review easier. You paste in a customer's message and the app pulls out the relevant details, checks for missing or conflicting information, and recommends one of three next steps: Approve, Human Review, or Decline. It also shows the parts of the message used to reach that result, so the agent can check them.

The live integration uses four Clocked services. Protect masks personal information before the other calls. Guard looks for prompt injection and stops the process when the input is risky or unclear. Extract identifies details such as order references and delivery dates. Decide helps assess the customer's request, item condition, and reported problems. Local rules then determine which recommendation is safe to show.

The app does not process refunds, contact customers, or confirm that an order actually exists. Its job is to help a person review a request, not replace that person.

The video uses three made-up customer requests and local demo rules, so it does not spend Clocked credits. The actual Clocked integration is in the public source code. An earlier recording shows live Clocked calls, but it was made before the latest changes.

## Safety limits

The app is advisory. It does not issue refunds, send messages, change orders or verify that an order exists. When the message is missing a delivery date, names more than one order, contains contradictory facts, mentions a defect or safety problem, uses a product unknown to the sample catalog, or asks for something other than a refund, the result is Human Review rather than an automatic approval or decline. The policy window and product list are examples, and customer statements are never treated as verified facts.

Live mode is disabled by default. It requires a server-side API key, a private access token, an explicit enable flag, a record that the key was rotated, and a confirmed upstream spending cap of 0.05 USD or less. Without all of these, the server refuses the request before any Clocked call is made. The narrated demo uses local rules and makes no paid Clocked calls, so it costs nothing to reproduce.

## How a judge can test it

The three examples run without an account or API key:

```bash
git clone https://github.com/Cho3en/Clocked-Return-Lab.git
cd Clocked-Return-Lab
npm ci
npm run dev
```

Open http://localhost:3000 with Demo fixtures selected, then run Clear return, Defective item and Outside window. The narrated video shows the same three outcomes. The test commands and their results are in docs/FINAL_RELEASE_AUDIT.md.

## Who is this for?

Small online stores and support teams that deal with return emails and want a quicker way to spot missing details and cases that need attention.

## Source code

https://github.com/Cho3en/Clocked-Return-Lab

## Narrated demo

https://github.com/Cho3en/Clocked-Return-Lab/releases/download/demo-v6/clocked-return-lab-narrated-demo.mp4

## Guide for judges

https://github.com/Cho3en/Clocked-Return-Lab/blob/main/JUDGES_START_HERE.md

## Categories to consider

Best Overall App, Best Use of Decide/Extract/Fill, and Best Use of Protect/Guard/Inspect. Select only categories offered by the official form.

## Before you submit

Confirm eligibility, enter your contact details, attach the links, and check that the entry was saved. The stated deadline is November 10, 2026, at 11:59 p.m. Eastern, which is November 11 at 05:59 in Zagreb.
