"use client";

import React from "react";

interface ClockRingProps {
  hours: string;
  minutes: string;
  seconds: string;
  secondsNumber: number;
  dateLabel: string;
  isChimeActive: boolean;
  isMinutePulse: boolean;
}

export function ClockRing({
  hours,
  minutes,
  seconds,
  secondsNumber,
  dateLabel,
  isChimeActive,
  isMinutePulse,
}: ClockRingProps) {
  const size = 300;
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // At second 0, show a full ring brief flash or start cleanly
  const normalizedProgress = secondsNumber === 0 && isMinutePulse ? 1 : secondsNumber / 60;
  const strokeDashoffset = circumference * (1 - normalizedProgress);

  const secondsRemaining = 60 - secondsNumber;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Subtle Ambient Glow when Active */}
      <div
        className={`pointer-events-none absolute -inset-4 rounded-full blur-3xl transition-opacity duration-700 ${
          isMinutePulse
            ? "bg-emerald-400/25 opacity-100"
            : isChimeActive
              ? "bg-emerald-500/10 opacity-100"
              : "opacity-0"
        }`}
      />

      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform overflow-visible"
          aria-hidden="true"
        >
          {/* Background Track Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-900"
          />

          {/* Subtle Minute Tick Marks (Every 5 seconds) */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = (idx * 30 * Math.PI) / 180;
            const innerR = radius - 10;
            const outerR = radius - 5;
            const x1 = size / 2 + innerR * Math.cos(angle);
            const y1 = size / 2 + innerR * Math.sin(angle);
            const x2 = size / 2 + outerR * Math.cos(angle);
            const y2 = size / 2 + outerR * Math.sin(angle);
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={idx % 3 === 0 ? 2 : 1}
                className="text-zinc-800"
              />
            );
          })}

          {/* Animated Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-[stroke-dashoffset,color] duration-500 ease-out ${
              isMinutePulse
                ? "text-emerald-300 drop-shadow-[0_0_12px_rgba(110,231,183,0.8)]"
                : isChimeActive
                  ? "text-emerald-400"
                  : "text-zinc-600"
            }`}
          />
        </svg>

        {/* Center Clock Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
            {dateLabel || "\u00A0"}
          </span>

          <div
            className={`font-mono text-6xl font-semibold tracking-tight tabular-nums transition-transform duration-300 ${
              isMinutePulse ? "scale-105 text-emerald-300" : "text-zinc-50"
            }`}
          >
            <span>{hours}</span>
            <span
              className={`mx-0.5 inline-block transition-opacity duration-200 ${
                secondsNumber % 2 === 0 ? "opacity-100" : "opacity-40"
              }`}
            >
              :
            </span>
            <span>{minutes}</span>
          </div>

          <div className="mt-2 flex items-center gap-2 font-mono text-lg tabular-nums text-zinc-400">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${
                isMinutePulse
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-zinc-900/90 text-zinc-400"
              }`}
            >
              .{seconds}s
            </span>
          </div>

          <p className="mt-3 text-[11px] font-medium tracking-wide text-zinc-500">
            {isChimeActive ? (
              secondsNumber === 0 ? (
                <span className="text-emerald-400 font-semibold">
                  Signalton ausgelöst
                </span>
              ) : (
                <span>Nächster Ton in {secondsRemaining} Sek.</span>
              )
            ) : (
              <span>Signalton pausiert</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
