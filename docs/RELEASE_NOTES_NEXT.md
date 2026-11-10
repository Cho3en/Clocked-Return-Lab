# Release notes: next release (prepared, not published)

Status: **draft**. Nothing here has been tagged, published or pushed as a
release. Publishing needs the owner's approval.

## Suggested name

`demo-v7`

## Source revision

The release must be cut from one exact commit on the `fix/final-release-quality`
branch after it is merged to `main`. Screenshots, subtitles, release text and
the judges' guide in that commit describe the same build.

## What the release demonstrates

The same three synthetic cases as before, with the same interface:

1. Clear return: Approve under the example 30-day policy.
2. Defective item: Human Review, because a product problem needs a person.
3. Outside window: Decline, with a note that a person still has to check
   customer rights.

The demo runs on local rules and makes no paid Clocked calls. That limitation
is unchanged and is stated in the README, the judges' guide and the video
narration.

## What changed since demo-v6

- Paid live analysis now requires an explicit enable flag, an API-key rotation
  attestation and a confirmed upstream spending cap of 0.05 USD or less. A
  blocked request never contacts Clocked.
- One shared phrase table now drives refund-intent classification, demo
  extraction and statement coverage, so ordinary phrasings such as
  "I'd like a refund" no longer fall into Human Review because of wording.
- Labelled delivery dates such as `Delivery date: 2026-10-28` are extracted in
  demo mode.
- Public screenshots were recaptured from this build.
- The security and browser checks now pass from a clean clone with no private
  configuration.
- The README no longer links directly into the historical audit folder, and the
  folder has its own index that explains what is historical.

## Video

The existing narrated video remains accurate for the three outcomes, the
pipeline explanation and the labels it shows. The only visible interface change
is tighter spacing in the mobile header and a clearer assessment label
("Explicit refund request" instead of "Explicit return/refund intent"), which
the video does not contradict. Recording a new video is optional.

## Known inconsistency in demo-v6 (do not move the tag)

The `demo-v6` tag points at commit `0bacadc`, which predates the copy refresh,
while the video asset attached to that release was recorded after the refresh.
The tag is therefore slightly older than the video it publishes. Do not move or
re-tag `demo-v6`. Cut `demo-v7` from the merged remediation commit instead.

## Still true after this release

- No paid Clocked calls have been rerun against the current build.
- No store, order, shipping or payment integration exists.
- Rate limits are in memory and reset when the server restarts.
- The product list and the 30-day window are examples.
- The official challenge entry has not been submitted through the website.
