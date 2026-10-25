import { NextRequest, NextResponse } from "next/server";
import { PushSubscription } from "web-push";
import {
  subscriptionsMap,
  sendMinutePushToSubscription,
} from "@/lib/push-server";

export const maxDuration = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Self-chaining Vercel Fluid Compute Push Scheduler:
 * Runs in the background on Vercel's server (up to 300s per invocation on Hobby),
 * triggers a Web Push notification to the user's iPhone at every exact :00 minute mark,
 * and automatically chains to a fresh server invocation before the 300s window ends
 * (up to `remainingMinutes`, default 60 minutes).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      subscription?: PushSubscription;
      timezone?: string;
      remainingMinutes?: number;
      sessionId?: string;
    };

    if (!body.subscription?.endpoint) {
      return NextResponse.json(
        { ok: false, error: "Missing subscription" },
        { status: 400 }
      );
    }

    const endpoint = body.subscription.endpoint;
    const timezone = body.timezone || "Europe/Berlin";
    let remainingMinutes =
      typeof body.remainingMinutes === "number" ? body.remainingMinutes : 60;

    const entry = {
      subscription: body.subscription,
      timezone,
      createdAt: Date.now(),
    };

    subscriptionsMap.set(endpoint, entry);

    const startTime = Date.now();
    let chimesSentInThisWindow = 0;

    // Run up to 4 full minutes inside this 300s Fluid Compute window
    while (
      remainingMinutes > 0 &&
      Date.now() - startTime < 230_000 &&
      subscriptionsMap.has(endpoint)
    ) {
      const nowMs = Date.now();
      const msUntilNextMinute = 60_000 - (nowMs % 60_000);

      await sleep(msUntilNextMinute);

      // Check if user unsubscribed while waiting
      if (!subscriptionsMap.has(endpoint)) {
        return NextResponse.json({
          ok: true,
          stopped: "unsubscribed",
          chimesSentInThisWindow,
        });
      }

      const success = await sendMinutePushToSubscription(entry);
      if (!success && !subscriptionsMap.has(endpoint)) {
        return NextResponse.json({
          ok: false,
          stopped: "subscription_expired",
        });
      }

      chimesSentInThisWindow += 1;
      remainingMinutes -= 1;

      // Small buffer so we don't double-trigger on the same :00 millisecond
      await sleep(1200);
    }

    // If more minutes remain and user is still subscribed, chain to the next serverless window
    if (remainingMinutes > 0 && subscriptionsMap.has(endpoint)) {
      const origin = req.nextUrl.origin;
      fetch(`${origin}/api/push/burst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: body.subscription,
          timezone,
          remainingMinutes,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      chimesSentInThisWindow,
      remainingMinutes,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message || "Burst error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const entries = Array.from(subscriptionsMap.values());
  const results = await Promise.all(
    entries.map((entry) => sendMinutePushToSubscription(entry))
  );
  return NextResponse.json({
    ok: true,
    sentCount: results.filter(Boolean).length,
    totalCount: entries.length,
  });
}
