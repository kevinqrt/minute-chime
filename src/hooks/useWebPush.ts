"use client";

import { useState, useCallback, useRef } from "react";

const PUBLIC_VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BORXTzKNkqzNyaceb8Mqxctk2ac0y3DCOWRTdnwqO5B5SZYIzCpDesCG2qhmy_ljO3cK3rx76PqlRG2jP6TmU-U";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus =
  | "idle"
  | "subscribing"
  | "active"
  | "unsupported"
  | "denied";

export function useWebPush() {
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushError, setPushError] = useState<string | null>(null);
  const subscriptionRef = useRef<PushSubscription | null>(null);

  const enableBackgroundPush = useCallback(async (): Promise<boolean> => {
    setPushError(null);

    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPushStatus("unsupported");
      setPushError(
        "Hinweis: Für iOS Hintergrund-Push muss die App zum Home-Bildschirm hinzugefügt und von dort geöffnet sein (ab iOS 16.4+)."
      );
      return false;
    }

    try {
      setPushStatus("subscribing");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        setPushError(
          "Benachrichtigungen wurden abgelehnt. Bitte in den iPhone-Einstellungen für Minute Chime erlauben."
        );
        return false;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey.buffer as ArrayBuffer,
        });
      }

      subscriptionRef.current = subscription;
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";

      // 1. Register & send immediate confirmation test push
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          subscription: subscription.toJSON(),
          timezone,
        }),
      });

      // 2. Start the server-side Fluid Compute background minute loop (runs even when iPhone app is closed!)
      fetch("/api/push/burst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          timezone,
          remainingMinutes: 60,
        }),
      }).catch(() => {});

      setPushStatus("active");
      return true;
    } catch (err: unknown) {
      setPushStatus("idle");
      setPushError(
        (err as Error)?.message ||
          "Push-Registrierung fehlgeschlagen. Stelle sicher, dass du die App über das Home-Screen-Icon geöffnet hast."
      );
      return false;
    }
  }, []);

  const disableBackgroundPush = useCallback(async (): Promise<void> => {
    try {
      const sub = subscriptionRef.current;
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsubscribe",
            subscription: sub.toJSON(),
          }),
        });
      }
    } catch {
      // Ignore network errors on unsubscribe
    } finally {
      setPushStatus("idle");
    }
  }, []);

  const sendTestPush = useCallback(async (): Promise<void> => {
    if (!subscriptionRef.current) {
      await enableBackgroundPush();
      return;
    }
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "test",
        subscription: subscriptionRef.current.toJSON(),
        timezone,
      }),
    });
  }, [enableBackgroundPush]);

  return {
    pushStatus,
    pushError,
    enableBackgroundPush,
    disableBackgroundPush,
    sendTestPush,
  };
}
