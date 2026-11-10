import { ImageResponse } from "next/og";

export const alt = "Clocked Return Lab: return review with evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(158deg, #fff7f0 0%, #fffaf7 58%, #ffe9d8 100%)",
          color: "#6e1f0a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: "#a8371a" }}>
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#d9552f" }} />
          Return review with evidence
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 76, lineHeight: 1.06, letterSpacing: -2, fontWeight: 700, maxWidth: 900 }}>
            Return requests deserve a decision you can defend.
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "#6b5a55", maxWidth: 860 }}>
            Approve, Human Review, or Decline with the exact words behind every result.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24, fontWeight: 700 }}>
          <div style={{ display: "flex", padding: "12px 22px", borderRadius: 12, background: "#e8f3e6", color: "#2f6b45" }}>Approve</div>
          <div style={{ display: "flex", padding: "12px 22px", borderRadius: 12, background: "#fff1d7", color: "#8a5a12" }}>Human Review</div>
          <div style={{ display: "flex", padding: "12px 22px", borderRadius: 12, background: "#fbe9e6", color: "#a3362d" }}>Decline</div>
          <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", color: "#8b7a74", fontSize: 22 }}>Clocked Return Lab</div>
        </div>
      </div>
    ),
    size,
  );
}
