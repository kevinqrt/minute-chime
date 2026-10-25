import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            width: "136px",
            height: "136px",
            borderRadius: "9999px",
            border: "8px solid #10b981",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fafafa",
            fontFamily: "monospace",
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: "38px", letterSpacing: "-1px" }}>:00</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
