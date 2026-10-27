"use client";

import React, { useState } from "react";
import {
  Bell,
  BellOff,
  Volume2,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
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
}: ChimeControlsProps) {
  const [showShortcutGuide, setShowShortcutGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const soundUrl = `https://minute-chime.vercel.app/api/sound?profile=${profile}`;
  const runShortcutHref = `shortcuts://run-shortcut?name=${encodeURIComponent(
    "Minute Chime"
  )}&input=text&text=${encodeURIComponent(soundUrl)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(soundUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full max-w-sm space-y-3.5">
      {/* Primary Activation Toggle Button (In-App Ambient Mode) */}
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
            <span>In-App Ton Aktiv (Jede :00)</span>
          </>
        ) : (
          <>
            <BellOff className="h-5 w-5 text-zinc-400" />
            <span>In-App Signalton aktivieren</span>
          </>
        )}
      </button>

      {/* iOS Native Shortcut Card (Background + Spotify + YouTube + Dynamic Island) */}
      <div className="rounded-2xl bg-zinc-900/90 p-3.5 ring-1 ring-emerald-500/30 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-100">
                iOS Hintergrund + Spotify & YouTube
              </p>
              <p className="text-[11px] text-zinc-400">
                Startet via Apple Kurzbefehl inkl. Dynamic Island
              </p>
            </div>
          </div>

          <a
            href={runShortcutHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-emerald-400 active:scale-95"
          >
            <span>Starten</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setShowShortcutGuide((v) => !v)}
          className="flex w-full items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
        >
          <span>Einmalige Einrichtung (4 Blöcke in 30 Sek.)</span>
          {showShortcutGuide ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showShortcutGuide && (
          <div className="space-y-2.5 rounded-xl bg-zinc-950 p-3 text-xs text-zinc-300 ring-1 ring-zinc-800">
            <div className="space-y-1">
              <p className="font-semibold text-zinc-100">
                1. Sound-URL für deinen aktuellen Ton kopieren:
              </p>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 truncate rounded-lg bg-zinc-900 px-2 py-1.5 font-mono text-[10px] text-emerald-300 ring-1 ring-zinc-800">
                  {soundUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-100 hover:bg-zinc-700 active:scale-95"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Kopiert</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Kopieren</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1 text-[11px] leading-relaxed text-zinc-400">
              <p className="font-semibold text-zinc-200">
                2. In der iPhone „Kurzbefehle“-App (+) neu anlegen:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-zinc-300">
                <li>
                  Name des Kurzbefehls: <strong className="text-emerald-300">Minute Chime</strong>
                </li>
                <li>
                  Aktion <strong>„Inhalte von URL abrufen“</strong> hinzufügen &amp; die kopierte Sound-URL einfügen.
                </li>
                <li>
                  Aktion <strong>„Wiederholen“</strong> hinzufügen (z. B. <strong>60 Mal</strong>).
                </li>
                <li>
                  In die Schleife ziehen: <strong>„Warten“ (60 Sekunden)</strong> und darunter <strong>„Ton abspielen“</strong> (wählt automatisch die abgerufene Sound-Datei).
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

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
          Spotify-Mix (Ambient) aktiv
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
            Klangprofil
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
