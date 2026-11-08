export type SampleId = "eligible" | "exception" | "expired";
export interface Sample {
  id: SampleId;
  label: string;
  tag: string;
  message: string;
}
function shiftDate(referenceDate: string, dayDelta: number) {
  const date = new Date(referenceDate + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}
export function createSamples(referenceDate: string): Sample[] {
  return [
    {
      id: "eligible",
      label: "Clear return",
      tag: "Expected: approve",
      message: "Subject: Return request for order ORD-24015\n\nHi, I am Maya Chen (maya.chen@example.com). My order ORD-24015 for the Atlas Desk Lamp was delivered on " + shiftDate(referenceDate, -12) + ". It is unused and unopened in its original packaging. I would like to return it for a refund. Thank you.",
    },
    {
      id: "exception",
      label: "Defective item",
      tag: "Expected: review",
      message: "Subject: Refund request for order ORD-24016\n\nHello, I'm Chris Brown. The Nimbus Headphones from order ORD-24016 stopped working after two days. I opened and used them. Can I get a refund? Please contact chris@example.com. I don't remember the delivery date.",
    },
    {
      id: "expired",
      label: "Outside window",
      tag: "Expected: decline",
      message: "Subject: Return for order ORD-24017\n\nHi, order ORD-24017 for the Cedar Wall Clock was delivered on " + shiftDate(referenceDate, -58) + ". It is unused and unopened with the original packaging. I want to return it for a refund. My email is pat@example.com.",
    },
  ];
}
