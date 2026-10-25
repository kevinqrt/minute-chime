"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { chimeAudio } from "@/lib/audio-engine";

interface UseLivePipOptions {
  hours: string;
  minutes: string;
  seconds: string;
  secondsNumber: number;
  isChimeActive: boolean;
  isMinutePulse: boolean;
}

interface WebKitVideoElement extends HTMLVideoElement {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: "picture-in-picture" | "inline") => void;
  webkitPresentationMode?: string;
  captureStream?: (frameRate?: number) => MediaStream;
  mozCaptureStream?: (frameRate?: number) => MediaStream;
}

export function useLivePip({
  hours,
  minutes,
  seconds,
  secondsNumber,
  isChimeActive,
  isMinutePulse,
}: UseLivePipOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<WebKitVideoElement | null>(null);
  const streamInitializedRef = useRef(false);
  const [isPipActive, setIsPipActive] = useState(false);

  // Render the Dynamic-Island style Live Activity frame onto the canvas every tick
  const renderCanvasFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const secondsRemaining = 60 - secondsNumber;
    const progress = secondsNumber === 0 && isMinutePulse ? 1 : secondsNumber / 60;

    // 1. Deep OLED Black Background
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);

    // Subtle border card
    const pad = 10;
    const cardW = w - pad * 2;
    const cardH = h - pad * 2;
    const radius = 28;

    ctx.beginPath();
    ctx.roundRect(pad, pad, cardW, cardH, radius);
    ctx.fillStyle = isMinutePulse ? "#062e22" : "#0c0c0f";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isMinutePulse
      ? "#34d399"
      : isChimeActive
        ? "#10b98144"
        : "#27272a";
    ctx.stroke();

    // 2. Status Dot & Top Label
    ctx.beginPath();
    ctx.arc(38, 42, 6, 0, Math.PI * 2);
    ctx.fillStyle = isChimeActive ? "#34d399" : "#71717a";
    ctx.fill();

    ctx.font = "600 16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = isChimeActive ? "#a7f3d0" : "#a1a1aa";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      isChimeActive ? "MINUTE CHIME · LIVE" : "MINUTE CHIME · PAUSIERT",
      54,
      42
    );

    // 3. Left Main Time (HH:MM:SS)
    ctx.font = "700 54px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = isMinutePulse ? "#6ee7b7" : "#fafafa";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${hours}:${minutes}`, 32, 112);

    ctx.font = "600 28px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#71717a";
    ctx.fillText(`.${seconds}`, 202, 112);

    // 4. Right Countdown Badge ("Nächste Min in Xs")
    const badgeX = w - 32;
    ctx.textAlign = "right";
    if (secondsNumber === 0 && isMinutePulse) {
      ctx.font = "700 32px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#34d399";
      ctx.fillText("🔔 :00!", badgeX, 95);
    } else {
      ctx.font = "500 15px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText("NÄCHSTE MINUTE", badgeX, 68);

      ctx.font = "700 42px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = secondsRemaining <= 5 ? "#34d399" : "#fafafa";
      ctx.fillText(`-${secondsRemaining}s`, badgeX, 112);
    }

    // 5. Bottom Progress Bar inside Card
    const barX = 32;
    const barY = h - 34;
    const barW = w - 64;
    const barH = 10;

    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 5);
    ctx.fillStyle = "#18181b";
    ctx.fill();

    const fillW = Math.max(10, barW * progress);
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 5);
    ctx.fillStyle = isMinutePulse
      ? "#6ee7b7"
      : isChimeActive
        ? "#10b981"
        : "#52525b";
    ctx.fill();
  }, [hours, minutes, seconds, secondsNumber, isChimeActive, isMinutePulse]);

  useEffect(() => {
    renderCanvasFrame();
  }, [renderCanvasFrame]);

  /**
   * Initializes the muted Canvas->Video stream so iOS Safari is ready for Picture-in-Picture
   * without interrupting background music.
   */
  const ensureVideoStreamPlaying = useCallback(async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return false;

    renderCanvasFrame();

    try {
      if (!streamInitializedRef.current && typeof canvas.captureStream === "function") {
        const canvasStream = canvas.captureStream(15);
        const combinedTracks = [...canvasStream.getVideoTracks()];
        const audioTrack = chimeAudio.getAudioStreamTrack();
        if (audioTrack) {
          combinedTracks.push(audioTrack);
        }
        const combinedStream = new MediaStream(combinedTracks);
        video.srcObject = combinedStream;
        video.muted = false;
        video.volume = 1.0;
        streamInitializedRef.current = true;
      }

      if (video.paused) {
        await video.play();
      }
      return true;
    } catch {
      return false;
    }
  }, [renderCanvasFrame]);

  /**
   * Toggles the floating iOS Picture-in-Picture Live Countdown window.
   */
  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    await ensureVideoStreamPlaying();

    try {
      // Standard Picture-in-Picture API
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
        return;
      }

      // iOS Safari WebKit Presentation Mode API
      if (
        typeof video.webkitSupportsPresentationMode === "function" &&
        video.webkitSupportsPresentationMode("picture-in-picture") &&
        typeof video.webkitSetPresentationMode === "function"
      ) {
        const currentMode = video.webkitPresentationMode;
        const nextMode =
          currentMode === "picture-in-picture"
            ? "inline"
            : "picture-in-picture";
        video.webkitSetPresentationMode(nextMode);
        setIsPipActive(nextMode === "picture-in-picture");
        return;
      }

      if (typeof video.requestPictureInPicture === "function") {
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch {
      // Ignore if PiP was blocked or unsupported on device
    }
  }, [ensureVideoStreamPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPip = () => setIsPipActive(true);
    const handleLeavePip = () => setIsPipActive(false);
    const handleWebkitModeChange = () => {
      setIsPipActive(video.webkitPresentationMode === "picture-in-picture");
    };

    video.addEventListener("enterpictureinpicture", handleEnterPip);
    video.addEventListener("leavepictureinpicture", handleLeavePip);
    video.addEventListener(
      "webkitpresentationmodechanged",
      handleWebkitModeChange
    );

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPip);
      video.removeEventListener("leavepictureinpicture", handleLeavePip);
      video.removeEventListener(
        "webkitpresentationmodechanged",
        handleWebkitModeChange
      );
    };
  }, []);

  return {
    canvasRef,
    videoRef,
    isPipActive,
    ensureVideoStreamPlaying,
    togglePip,
  };
}
