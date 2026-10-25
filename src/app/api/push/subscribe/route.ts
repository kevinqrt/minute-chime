import { NextRequest, NextResponse } from "next/server";
import { PushSubscription } from "web-push";
import {
  subscriptionsMap,
  sendMinutePushToSubscription,
  VAPID_PUBLIC_KEY,
} from "@/lib/push-server";

export async function GET() {
  return NextResponse.json({
    publicKey: VAPID_PUBLIC_KEY,
    activeSubscribers: subscriptionsMap.size,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: "subscribe" | "unsubscribe" | "test" | "trigger";
      subscription?: PushSubscription;
      timezone?: string;
    };

    if (body.action === "unsubscribe" && body.subscription?.endpoint) {
      subscriptionsMap.delete(body.subscription.endpoint);
      return NextResponse.json({ ok: true, subscribed: false });
    }

    if (!body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { ok: false, error: "Missing push subscription" },
        { status: 400 }
      );
    }

    const entry = {
      subscription: body.subscription,
      timezone: body.timezone || "Europe/Berlin",
      createdAt: Date.now(),
    };

    subscriptionsMap.set(body.subscription.endpoint, entry);

    if (body.action === "test") {
      const sent = await sendMinutePushToSubscription(
        entry,
        "🔔 Minute Chime Aktiv!",
        "Hintergrund-Push funktioniert! Musik läuft weiter & jede Minute kommt dein Signal."
      );
      return NextResponse.json({ ok: sent, subscribed: true });
    }

    if (body.action === "trigger") {
      const sent = await sendMinutePushToSubscription(entry);
      return NextResponse.json({ ok: sent, subscribed: true });
    }

    return NextResponse.json({
      ok: true,
      subscribed: true,
      totalSubscribers: subscriptionsMap.size,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message || "Internal error" },
      { status: 500 }
    );
  }
}
