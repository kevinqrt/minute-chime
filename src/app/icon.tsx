import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "112px",
        }}
      >
        <div
          style={{
            width: "380px",
            height: "380px",
            borderRadius: "9999px",
            border: "22px solid #10b981",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fafafa",
            fontFamily: "monospace",
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: "112px", letterSpacing: "-4px" }}>:00</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
