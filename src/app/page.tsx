"use client";

import React, { useState, useCallback } from "react";
import { ClockRing } from "@/components/ClockRing";
import { ChimeControls } from "@/components/ChimeControls";
import { PwaInstallHint } from "@/components/PwaInstallHint";
import { usePreciseClock } from "@/hooks/usePreciseClock";
import { useChimeSettings } from "@/hooks/useChimeSettings";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useLivePip } from "@/hooks/useLivePip";
import { useWebPush } from "@/hooks/useWebPush";
import { chimeAudio, ChimeProfile } from "@/lib/audio-engine";

export default function HomePage() {
  const [isChimeActive, setIsChimeActive] = useState(false);
  const { settings, setProfile, setVolume } = useChimeSettings();
  const { isWakeLockActive } = useWakeLock(isChimeActive);
  const {
    pushStatus,
    pushError,
    enableBackgroundPush,
    disableBackgroundPush,
  } = useWebPush();

  const handleFullMinute = useCallback(() => {
    if (!isChimeActive) return;
    if (!chimeAudio.isBackgroundStreamRunning()) {
      chimeAudio.playChime(settings.profile, settings.volume);
    }
  }, [isChimeActive, settings.profile, settings.volume]);

  const clock = usePreciseClock({
    onFullMinute: handleFullMinute,
  });

  const {
    canvasRef,
    videoRef,
    isPipActive,
    ensureVideoStreamPlaying,
    togglePip,
  } = useLivePip({
    hours: clock.hours,
    minutes: clock.minutes,
    seconds: clock.seconds,
    secondsNumber: clock.secondsNumber,
    isChimeActive,
    isMinutePulse: clock.isMinutePulse,
  });

  const handleToggleActive = async () => {
    if (!isChimeActive) {
      await chimeAudio.unlockAndStartKeepAlive(
        settings.profile,
        settings.volume
      );
      await ensureVideoStreamPlaying();
      chimeAudio.playChime(settings.profile, settings.volume);
      setIsChimeActive(true);
      if (pushStatus === "idle") {
        void enableBackgroundPush();
      }
    } else {
      chimeAudio.stopKeepAlive();
      setIsChimeActive(false);
      if (pushStatus === "active") {
        void disableBackgroundPush();
      }
    }
  };

  const handleTogglePush = async () => {
    if (pushStatus === "active") {
      await disableBackgroundPush();
    } else {
      const ok = await enableBackgroundPush();
      if (ok && !isChimeActive) {
        await chimeAudio.unlockAndStartKeepAlive(
          settings.profile,
          settings.volume
        );
        await ensureVideoStreamPlaying();
        setIsChimeActive(true);
      }
    }
  };

  const handleTogglePip = async () => {
    if (!isChimeActive) {
      await chimeAudio.unlockAndStartKeepAlive(
        settings.profile,
        settings.volume
      );
      chimeAudio.playChime(settings.profile, settings.volume);
      setIsChimeActive(true);
    }
    await togglePip();
  };

  const handleSelectProfile = async (nextProfile: ChimeProfile) => {
    setProfile(nextProfile);
    chimeAudio.playChime(nextProfile, settings.volume);
    if (isChimeActive) {
      await chimeAudio.unlockAndStartKeepAlive(nextProfile, settings.volume);
    }
  };

  const handleChangeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    if (isChimeActive) {
      chimeAudio.preScheduleUpcomingMinutes(settings.profile, nextVolume);
    }
  };

  const handleTestSound = async () => {
    await chimeAudio.unlockAndStartKeepAlive(settings.profile, settings.volume);
    chimeAudio.playChime(settings.profile, settings.volume);
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between bg-black px-5 pt-safe pb-safe text-zinc-50">
      {/* Hidden Canvas & Muted Video for iOS Picture-in-Picture Live Countdown */}
      <canvas
        ref={canvasRef}
        width={480}
        height={170}
        className="pointer-events-none fixed -left-[9999px] -top-[9999px] opacity-0"
        aria-hidden="true"
      />
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className="pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0"
        aria-hidden="true"
      />

      {/* Header Bar */}
      <header className="flex w-full max-w-sm items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
              isChimeActive || pushStatus === "active"
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                : "bg-zinc-700"
            }`}
          />
          <h1 className="text-sm font-semibold tracking-wide text-zinc-200">
            Minute Chime
          </h1>
        </div>
        <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 font-mono text-[11px] text-zinc-400 ring-1 ring-zinc-800">
          iOS PWA + Push
        </span>
      </header>

      {/* Center Clock & Visual Second Ring */}
      <section className="my-auto flex flex-col items-center justify-center py-4">
        <ClockRing
          hours={clock.hours}
          minutes={clock.minutes}
          seconds={clock.seconds}
          secondsNumber={clock.secondsNumber}
          dateLabel={clock.dateLabel}
          isChimeActive={isChimeActive || pushStatus === "active"}
          isMinutePulse={clock.isMinutePulse}
        />
      </section>

      {/* Bottom Controls & iOS Install Hint */}
      <footer className="flex w-full flex-col items-center gap-4 pb-2">
        <ChimeControls
          isActive={isChimeActive}
          onToggleActive={handleToggleActive}
          profile={settings.profile}
          onSelectProfile={handleSelectProfile}
          volume={settings.volume}
          onChangeVolume={handleChangeVolume}
          onTestSound={handleTestSound}
          isWakeLockActive={isWakeLockActive}
          isPipActive={isPipActive}
          onTogglePip={handleTogglePip}
          pushStatus={pushStatus}
          pushError={pushError}
          onTogglePush={handleTogglePush}
        />
        <PwaInstallHint />
      </footer>
    </main>
  );
}
