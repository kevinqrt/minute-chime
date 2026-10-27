import { NextRequest, NextResponse } from "next/server";

type ChimeProfile = "digital" | "bell" | "click";

function generateSingleChimeWavBuffer(
  profile: ChimeProfile,
  volume = 0.95
): ArrayBuffer {
  const sampleRate = 44100;
  const bytesPerSample = 2; // 16-bit PCM
  const durationSec = profile === "bell" ? 1.5 : profile === "click" ? 0.15 : 0.35;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF WAVE Header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const samples = new Int16Array(buffer, 44, numSamples);
  const safeVol = Math.max(0.1, Math.min(1, volume));

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    if (profile === "digital") {
      // Classic Casio double-beep at 1046.5 Hz (C6)
      if ((t >= 0 && t <= 0.075) || (t >= 0.11 && t <= 0.195)) {
        const localT = t >= 0.11 ? t - 0.11 : t;
        const env = Math.min(1, localT / 0.004) * Math.exp(-localT * 6);
        const harm1 = Math.sin(2 * Math.PI * 1046.5 * t);
        const harm3 = 0.25 * Math.sin(2 * Math.PI * 3139.5 * t);
        val = (harm1 + harm3) * env * safeVol * 0.75;
      }
    } else if (profile === "bell") {
      // Harmonic Zen Bell (528 Hz + 1056 Hz overtone)
      const attack = Math.min(1, t / 0.008);
      const decay1 = Math.exp(-t * 3.2);
      const decay2 = Math.exp(-t * 6.0);
      const f1 = Math.sin(2 * Math.PI * 528 * t) * decay1 * 0.7;
      const f2 = Math.sin(2 * Math.PI * 1056 * t) * decay2 * 0.3;
      val = (f1 + f2) * attack * safeVol * 0.9;
    } else if (profile === "click") {
      // Short woody focus click
      if (t <= 0.05) {
        const freq = 340 * Math.exp(-t * 45);
        const env = Math.exp(-t * 70);
        val = Math.sin(2 * Math.PI * freq * t) * env * safeVol * 0.95;
      }
    }

    const clamped = Math.max(-1, Math.min(1, val));
    samples[i] = Math.floor(clamped * 32767);
  }

  return buffer;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawProfile = searchParams.get("profile") || "digital";
  const profile: ChimeProfile =
    rawProfile === "bell" || rawProfile === "click" ? rawProfile : "digital";

  const wavBuffer = generateSingleChimeWavBuffer(profile, 0.95);

  return new NextResponse(wavBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Content-Disposition": `inline; filename="minute-chime-${profile}.wav"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
