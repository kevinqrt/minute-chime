"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { ChimeProfile } from "@/lib/audio-engine";

export interface ChimeSettings {
  profile: ChimeProfile;
  volume: number;
}

const STORAGE_KEY = "minute-chime-settings-v1";

const DEFAULT_SETTINGS: ChimeSettings = {
  profile: "digital",
  volume: 0.85,
};

function readStoredSettings(): ChimeSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ChimeSettings>;
    return {
      profile:
        parsed.profile === "digital" ||
        parsed.profile === "bell" ||
        parsed.profile === "click"
          ? parsed.profile
          : DEFAULT_SETTINGS.profile,
      volume:
        typeof parsed.volume === "number" &&
        parsed.volume >= 0.05 &&
        parsed.volume <= 1
          ? parsed.volume
          : DEFAULT_SETTINGS.volume,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const emptySubscribe = () => () => {};

export function useChimeSettings() {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [settings, setSettings] = useState<ChimeSettings>(() =>
    readStoredSettings()
  );

  const updateSettings = useCallback((partial: Partial<ChimeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const effectiveSettings = isHydrated ? settings : DEFAULT_SETTINGS;

  return {
    settings: effectiveSettings,
    isLoaded: isHydrated,
    setProfile: (profile: ChimeProfile) => updateSettings({ profile }),
    setVolume: (volume: number) => updateSettings({ volume }),
  };
}
