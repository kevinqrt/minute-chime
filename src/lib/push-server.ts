import webpush, { PushSubscription } from "web-push";

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BORXTzKNkqzNyaceb8Mqxctk2ac0y3DCOWRTdnwqO5B5SZYIzCpDesCG2qhmy_ljO3cK3rx76PqlRG2jP6TmU-U";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "0MN6eXoMF7phU-UQdR0KBMGSSB6gi1giDcWcoiyPp3Y";

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:kevinbrungard91@gmail.com";

let vapidConfigured = false;

export function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

export interface StoredSubscriptionEntry {
  subscription: PushSubscription;
  timezone: string;
  createdAt: number;
}

// Global in-memory store + file fallback in /tmp so serverless warm instances retain subscriptions
const globalForPush = globalThis as unknown as {
  __minuteChimeSubs?: Map<string, StoredSubscriptionEntry>;
};

if (!globalForPush.__minuteChimeSubs) {
  globalForPush.__minuteChimeSubs = new Map<string, StoredSubscriptionEntry>();
}

export const subscriptionsMap = globalForPush.__minuteChimeSubs;

export async function sendMinutePushToSubscription(
  entry: StoredSubscriptionEntry,
  customTitle?: string,
  customBody?: string
): Promise<boolean> {
  ensureVapidConfigured();

  const now = new Date();
  let formattedTime = "";
  try {
    formattedTime = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: entry.timezone || "Europe/Berlin",
    }).format(now);
  } catch {
    formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  }

  const payload = JSON.stringify({
    title: customTitle || `🔔 ${formattedTime} Uhr`,
    body: customBody || `Volle Minute erreicht · Nächster Ton in 60s`,
    tag: "minute-chime-tick",
    timestamp: Date.now(),
  });

  try {
    await webpush.sendNotification(entry.subscription, payload, {
      TTL: 55,
      urgency: "high",
    });
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      subscriptionsMap.delete(entry.subscription.endpoint);
    }
    return false;
  }
}
