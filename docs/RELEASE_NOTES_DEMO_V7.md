# Release notes: demo-v7 (prepared, not published)

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

## Video and subtitles

The existing narrated video is reused unchanged, with a version note. It was
downloaded from the `demo-v6` release and checked against this build on
November 10, 2026:

- 107.2 seconds, 1600 x 900, MP4, with an audio track.
- Audio decodes and the 24 subtitle cues match the narration.
- The three recommendations, the evidence panels, the five live stages and the
  disclosure that live mode is not run in the video all match the current
  application and copy.
- No credentials, personal data or internal development notes appear.

The only interface differences since recording are 4 pixels of height on the
small Clear action, tighter mobile header spacing (not visible in a 1600 x 900
desktop recording) and the clearer assessment label, which sits in a panel the
video keeps collapsed. Nothing the video claims is now false, so a new
recording was not made and the old file was not renamed to pretend otherwise.

Subtitles are reused unchanged from the `demo-v6` release asset.

## Known inconsistency in demo-v6 (do not move the tag)

The `demo-v6` tag points at commit `0bacadc`, which predates the copy refresh,
while the video asset attached to that release was recorded after the refresh.
The tag is therefore slightly older than the video it publishes. Do not move or
re-tag `demo-v6`. Cut `demo-v7` from the merged remediation commit instead.

## Assets for the release

- Source: the final commit on the merged remediation branch (tag target).
- `assets/dashboard.png`, `assets/approved.png`, `assets/review.png`,
  `assets/declined.png`, `assets/mobile.png`: recaptured from that commit.
- `clocked-return-lab-narrated-demo.mp4` and `.srt`: reused from `demo-v6`,
  verified above.
- Release text: this file plus `docs/FINAL_RELEASE_AUDIT.md`.
- README and `JUDGES_START_HERE.md`: current commit.

## Owner steps after approval

Do not create the tag or release until the owner approves. When approved:

1. Merge PR #13. The merge commit on `main` becomes the release source.
2. Confirm the merged commit still passes CI.
3. Create the tag on that commit and attach the two existing demo-v6 media
   files unchanged:
   - `clocked-return-lab-narrated-demo.mp4`
   - `clocked-return-lab-narrated-demo.srt`
4. Use this file as the release description, with one added line: "The video
   was recorded for demo-v6 and still matches this build; it was not
   re-recorded for demo-v7."
5. Do not move the `demo-v6` tag.

Suggested commands (run only after approval):

```bash
gh pr merge 13 --merge
gh release create demo-v7 --target main --title "Clocked Return Lab: demo-v7" --notes-file docs/RELEASE_NOTES_DEMO_V7.md
gh release upload demo-v7 clocked-return-lab-narrated-demo.mp4 clocked-return-lab-narrated-demo.srt
```

## Still true after this release

- No paid Clocked calls have been rerun against the current build.
- No store, order, shipping or payment integration exists.
- Rate limits are in memory and reset when the server restarts.
- The product list and the 30-day window are examples.
- The official challenge entry has not been submitted through the website.
