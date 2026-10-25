"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Share, PlusSquare, X } from "lucide-react";

const emptySubscribe = () => () => {};

function getShouldShowByDefault(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true;

  let dismissed = false;
  try {
    dismissed =
      window.sessionStorage.getItem("minute-chime-pwa-hint-dismissed") === "1";
  } catch {
    // Ignore storage error
  }

  return !isStandalone && !dismissed;
}

export function PwaInstallHint() {
  const shouldShowDefault = useSyncExternalStore(
    emptySubscribe,
    getShouldShowByDefault,
    () => false
  );

  const [manuallyDismissed, setManuallyDismissed] = useState(false);

  if (!shouldShowDefault || manuallyDismissed) return null;

  const handleDismiss = () => {
    setManuallyDismissed(true);
    try {
      window.sessionStorage.setItem("minute-chime-pwa-hint-dismissed", "1");
    } catch {
      // Ignore storage error
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-zinc-900/75 px-4 py-3 text-xs text-zinc-400 ring-1 ring-zinc-800/80 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-semibold text-zinc-200">
            Für beste iPhone-Nutzung als App installieren:
          </p>
          <p className="leading-relaxed text-zinc-400">
            Tippe in Safari auf{" "}
            <span className="inline-flex items-center gap-0.5 font-medium text-zinc-200">
              <Share className="inline h-3.5 w-3.5 text-emerald-400" /> Teilen
            </span>{" "}
            und wähle{" "}
            <span className="inline-flex items-center gap-0.5 font-medium text-zinc-200">
              <PlusSquare className="inline h-3.5 w-3.5 text-emerald-400" /> Zum
              Home-Bildschirm
            </span>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Hinweis schließen"
          className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
