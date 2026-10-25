"use client";

import { useState, useEffect, useRef } from "react";

interface UsePreciseClockOptions {
  onFullMinute?: () => void;
}

export function usePreciseClock({ onFullMinute }: UsePreciseClockOptions = {}) {
  const [now, setNow] = useState<Date | null>(null);
  const [isMinutePulse, setIsMinutePulse] = useState(false);

  const lastTriggeredMinuteKeyRef = useRef<string | null>(null);
  const onFullMinuteRef = useRef(onFullMinute);

  useEffect(() => {
    onFullMinuteRef.current = onFullMinute;
  }, [onFullMinute]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let pulseTimeoutId: ReturnType<typeof setTimeout>;

    const initDate = new Date();
    lastTriggeredMinuteKeyRef.current = `${initDate.getFullYear()}-${initDate.getMonth()}-${initDate.getDate()}-${initDate.getHours()}-${initDate.getMinutes()}`;

    const scheduleTick = (delayMs: number) => {
      timeoutId = setTimeout(() => {
        const current = new Date();
        setNow(current);

        const secs = current.getSeconds();
        const minuteKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}-${current.getHours()}-${current.getMinutes()}`;

        if (secs === 0 && lastTriggeredMinuteKeyRef.current !== minuteKey) {
          lastTriggeredMinuteKeyRef.current = minuteKey;
          setIsMinutePulse(true);
          pulseTimeoutId = setTimeout(() => setIsMinutePulse(false), 1200);
          onFullMinuteRef.current?.();
        }

        const msUntilNextSecond = 1000 - (Date.now() % 1000);
        scheduleTick(msUntilNextSecond + 5);
      }, delayMs);
    };

    // Immediate first tick on mount (0ms) so UI hydrates cleanly and complies with Next.js 16 prerender rules
    scheduleTick(0);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(pulseTimeoutId);
    };
  }, []);

  if (!now) {
    return {
      mounted: false,
      hours: "--",
      minutes: "--",
      seconds: "--",
      secondsNumber: 0,
      progress: 0,
      dateLabel: "",
      isMinutePulse: false,
    };
  }

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const secondsNumber = now.getSeconds();
  const seconds = String(secondsNumber).padStart(2, "0");
  const progress = secondsNumber / 60;

  const dateLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now);

  return {
    mounted: true,
    hours,
    minutes,
    seconds,
    secondsNumber,
    progress,
    dateLabel,
    isMinutePulse,
  };
}
