"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function useWakeLock(enabled: boolean) {
  const isSupported = useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && "wakeLock" in navigator,
    () => false
  );

  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const acquire = async () => {
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
        return;
      }
      try {
        if (sentinelRef.current && !sentinelRef.current.released) {
          return;
        }
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        setIsWakeLockActive(true);

        sentinel.addEventListener("release", () => {
          if (!cancelled) {
            setIsWakeLockActive(false);
          }
        });
      } catch {
        if (!cancelled) {
          setIsWakeLockActive(false);
        }
      }
    };

    const release = async () => {
      if (sentinelRef.current) {
        const current = sentinelRef.current;
        sentinelRef.current = null;
        try {
          await current.release();
        } catch {
          // Ignore release errors
        }
      }
      if (!cancelled) {
        setIsWakeLockActive(false);
      }
    };

    if (!enabled) {
      void release();
      return;
    }

    void acquire();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled) {
        void acquire();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sentinelRef.current) {
        void sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
    };
  }, [enabled]);

  return {
    isSupported,
    isWakeLockActive: enabled && isWakeLockActive,
  };
}
