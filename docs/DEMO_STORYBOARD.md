# Demo production notes

**Product:** Clocked Return Lab. **Video:** [Narrated demo (~101 seconds)](https://github.com/Cho3en/clocked-returns-refund-autopilot/releases/download/demo-v6/clocked-return-lab-narrated-demo.mp4).

The new recording captures the actual Tuscan Sunset interface with the three synthetic cases. It **never** calls paid Clocked endpoints or a merchant/refund API.

Scenes: introduction; clear return → provisional Approve; inspect grounded text; defective case → Human Review; old unused return → provisional Decline; separate Clocked live integration architecture (not executed); final human-control summary.

The narration was generated with a neural English voice. Its recording-time manifest, voice tracks, final composite and QA frames are retained locally in C:\VELES\QA\Clocked-Return-Lab\submission-2026-11-09 rather than embedding large files in the source repository.

The source browser recording script is [scripts/record-submission-demo.mjs](../scripts/record-submission-demo.mjs). It reads the local narration manifest; no private keys or customer data are required. **The old historical live video is not proof of current provider validity.**
