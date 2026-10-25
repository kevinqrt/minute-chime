"use client";

import React from "react";
import {
  Bell,
  BellOff,
  Volume2,
  Play,
  ShieldCheck,
  Smartphone,
  PictureInPicture2,
  BellRing,
} from "lucide-react";
import { CHIME_PROFILES, ChimeProfile } from "@/lib/audio-engine";
import { PushStatus } from "@/hooks/useWebPush";

interface ChimeControlsProps {
  isActive: boolean;
  onToggleActive: () => void;
  profile: ChimeProfile;
  onSelectProfile: (profile: ChimeProfile) => void;
  volume: number;
  onChangeVolume: (volume: number) => void;
  onTestSound: () => void;
  isWakeLockActive: boolean;
  isPipActive: boolean;
  onTogglePip: () => void;
  pushStatus: PushStatus;
  pushError: string | null;
  onTogglePush: () => void;
}

export function ChimeControls({
  isActive,
  onToggleActive,
  profile,
  onSelectProfile,
  volume,
  onChangeVolume,
  onTestSound,
  isWakeLockActive,
  isPipActive,
  onTogglePip,
  pushStatus,
  pushError,
  onTogglePush,
}: ChimeControlsProps) {
  return (
    <div className="w-full max-w-sm space-y-3.5">
      {/* Primary Activation Toggle Button */}
      <button
        type="button"
        onClick={onToggleActive}
        className={`group relative flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200 active:scale-[0.98] ${
          isActive
            ? "bg-emerald-500 text-zinc-950 shadow-[0_0_28px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
            : "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800/80"
        }`}
      >
        {isActive ? (
          <>
            <Bell className="h-5 w-5 fill-current animate-pulse" />
            <span>Minutenton Aktiv (Jede :00)</span>
          </>
        ) : (
          <>
            <BellOff className="h-5 w-5 text-zinc-400" />
            <span>Signalton aktivieren</span>
          </>
        )}
      </button>

      {/* iOS Background Web Push Button (Works when app is closed + Spotify playing) */}
      <button
        type="button"
        onClick={onTogglePush}
        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-xs font-medium transition-all active:scale-[0.98] ${
          pushStatus === "active"
            ? "bg-emerald-950/80 text-emerald-200 ring-1 ring-emerald-500/50"
            : "bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              pushStatus === "active"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-zinc-100">
              {pushStatus === "active"
                ? "iOS Hintergrund-Push Aktiv (Jede :00)"
                : pushStatus === "subscribing"
                  ? "Verbinde iOS Push-Dienst..."
                  : "iOS Hintergrund-Push aktivieren"}
            </p>
            <p className="text-[11px] text-zinc-400">
              Ton + Banner zu jeder vollen Minute – auch bei geschlossener App & Spotify
            </p>
          </div>
        </div>
        <span
          className={`ml-2 shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
            pushStatus === "active"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-zinc-800 text-zinc-300"
          }`}
        >
          {pushStatus === "active" ? "Aktiv" : "Start"}
        </span>
      </button>

      {pushError && (
        <p className="rounded-xl bg-amber-950/50 px-3 py-2 text-[11px] text-amber-200 ring-1 ring-amber-500/30">
          {pushError}
        </p>
      )}

      {/* Floating Live-Activity (Picture-in-Picture) Button */}
      <button
        type="button"
        onClick={onTogglePip}
        className={`flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-xs font-medium transition-all active:scale-[0.98] ${
          isPipActive
            ? "bg-emerald-950/80 text-emerald-200 ring-1 ring-emerald-500/50"
            : "bg-zinc-900/60 text-zinc-300 ring-1 ring-zinc-800/80 hover:bg-zinc-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
              isPipActive
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            <PictureInPicture2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-100">
              {isPipActive
                ? "Schwebendes Countdown-Widget aktiv"
                : "Schwebendes Countdown-Widget (PiP)"}
            </p>
            <p className="text-[11px] text-zinc-400">
              Zeigt die Sekunden bis zur nächsten Minute über allen Apps
            </p>
          </div>
        </div>
        <span
          className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${
            isPipActive
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-zinc-800 text-zinc-300"
          }`}
        >
          {isPipActive ? "An" : "Öffnen"}
        </span>
      </button>

      {/* Status Badges (Ambient Music Mix & Wake Lock) */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
            isActive
              ? "bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/30"
              : "bg-zinc-900/70 text-zinc-500 ring-1 ring-zinc-800/80"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {isActive ? "Musik-Mix (Ambient) aktiv" : "Musik-Mix bereit"}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
            isWakeLockActive
              ? "bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/30"
              : "bg-zinc-900/70 text-zinc-500 ring-1 ring-zinc-800/80"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          {isWakeLockActive ? "Display bleibt wach" : "Wake-Lock Standby"}
        </span>
      </div>

      {/* Sound Profile Selection & Volume Card */}
      <div className="rounded-2xl bg-zinc-950/90 p-4 ring-1 ring-zinc-800/90 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Klangprofil (In-App)
          </span>
          <button
            type="button"
            onClick={onTestSound}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 ring-1 ring-zinc-800 transition hover:bg-zinc-800 active:scale-95"
          >
            <Play className="h-3 w-3 fill-current text-emerald-400" />
            Ton testen
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {CHIME_PROFILES.map((item) => {
            const selected = item.id === profile;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectProfile(item.id)}
                className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-2 text-center transition-all active:scale-95 ${
                  selected
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/50"
                    : "bg-zinc-900/60 text-zinc-400 ring-1 ring-zinc-800/60 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Volume Slider */}
        <div className="pt-0.5">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
              Lautstärke
            </span>
            <span className="font-mono tabular-nums text-zinc-300">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            aria-label="Signalton Lautstärke"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}
