"use client";

export type ChimeProfile = "digital" | "bell" | "click";

export interface ChimeProfileMeta {
  id: ChimeProfile;
  label: string;
  description: string;
}

export const CHIME_PROFILES: ChimeProfileMeta[] = [
  {
    id: "digital",
    label: "Digital-Piep",
    description: "Klassischer Casio-Doppelpiep (1046 Hz)",
  },
  {
    id: "bell",
    label: "Zen-Glocke",
    description: "Sanfter, harmonischer Gong (528 Hz)",
  },
  {
    id: "click",
    label: "Dezenter Klick",
    description: "Kurzer Akustik-Impuls für Fokus",
  },
];

interface NavigatorWithAudioSession extends Navigator {
  audioSession?: {
    type:
      | "auto"
      | "playback"
      | "transient"
      | "transient-solo"
      | "ambient"
      | "play-and-record";
  };
}

/**
 * Generates an entire 15-minute native PCM WAV audio file in memory (~20ms generation time),
 * with the first chime aligned precisely to the upcoming :00 system second and subsequent
 * chimes placed every 60.000 seconds.
 *
 * Because iOS Safari freezes JavaScript timers and Web Audio API in the background,
 * playing a pre-rendered WAV file in a native HTML5 <audio loop> element is the ONLY
 * mechanism that iOS's hardware media decoder plays reliably in the background and on the lockscreen!
 */
function generateSynchronizedMinuteTrackBlobUrl(
  profile: ChimeProfile,
  volume: number,
  initialOffsetSec: number,
  totalMinutes = 15
): string {
  const sampleRate = 16000;
  const bytesPerSample = 2; // 16-bit PCM
  const totalSeconds = Math.ceil(initialOffsetSec + totalMinutes * 60);
  const numSamples = totalSeconds * sampleRate;
  const dataSize = numSamples * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // WAV Header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const samples = new Int16Array(buffer, 44, numSamples);
  const safeVol = Math.max(0.05, Math.min(1, volume));

  // Synthesize a single chime waveform template (max 1.5s)
  const chimeLenSamples = Math.floor(sampleRate * 1.5);
  const chimeTemplate = new Int16Array(chimeLenSamples);

  for (let i = 0; i < chimeLenSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    if (profile === "digital") {
      // Double Casio-style beep at 1046.5 Hz (0.00-0.075s and 0.11-0.195s)
      if ((t >= 0 && t <= 0.075) || (t >= 0.11 && t <= 0.195)) {
        const localT = t >= 0.11 ? t - 0.11 : t;
        const env = Math.min(1, localT / 0.004) * Math.exp(-localT * 8);
        const s = Math.sin(2 * Math.PI * 1046.5 * t) >= 0 ? 0.8 : -0.8;
        val = s * env * safeVol * 0.65;
      }
    } else if (profile === "bell") {
      // Harmonic Zen Bell (528 Hz + 1056 Hz overtone)
      if (t <= 1.45) {
        const attack = Math.min(1, t / 0.01);
        const decay1 = Math.exp(-t * 3.5);
        const decay2 = Math.exp(-t * 6.5);
        const f1 = Math.sin(2 * Math.PI * 528 * t) * decay1 * 0.7;
        const f2 = Math.sin(2 * Math.PI * 1056 * t) * decay2 * 0.3;
        val = (f1 + f2) * attack * safeVol * 0.85;
      }
    } else if (profile === "click") {
      // Short acoustic pitch-drop click (0.04s)
      if (t <= 0.045) {
        const freq = 320 * Math.exp(-t * 42);
        const env = Math.exp(-t * 75);
        val = Math.sin(2 * Math.PI * freq * t) * env * safeVol * 0.9;
      }
    }

    const clamped = Math.max(-1, Math.min(1, val));
    chimeTemplate[i] = Math.floor(clamped * 32767);
  }

  // Stamp the chime template at exact :00 minute positions across the audio buffer
  for (let m = 0; m < totalMinutes; m++) {
    const triggerTimeSec = initialOffsetSec + m * 60;
    const startSample = Math.floor(triggerTimeSec * sampleRate);
    for (
      let i = 0;
      i < chimeLenSamples && startSample + i < numSamples;
      i++
    ) {
      samples[startSample + i] = chimeTemplate[i];
    }
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

class ChimeAudioEngine {
  private ctx: AudioContext | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private bgAudioElement: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private isKeepAliveActive = false;
  private currentProfile: ChimeProfile = "digital";
  private currentVolume = 0.85;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && !this.streamDest) {
      try {
        this.streamDest = this.ctx.createMediaStreamDestination();
      } catch {
        // Ignore if unsupported
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public getAudioStreamTrack(): MediaStreamTrack | null {
    this.getContext();
    if (!this.streamDest) return null;
    const tracks = this.streamDest.stream.getAudioTracks();
    return tracks[0] || null;
  }

  /**
   * Starts the synchronized native HTML5 WAV audio stream so iOS plays the exact
   * synthesized chime sound at :00 even when the app is in the background or the iPhone is locked!
   */
  public async unlockAndStartKeepAlive(
    profile: ChimeProfile = "digital",
    volume = 0.85
  ): Promise<boolean> {
    this.currentProfile = profile;
    this.currentVolume = volume;

    const ctx = this.getContext();
    if (ctx && ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    try {
      await this.startSynchronizedBackgroundWav(profile, volume);
      this.isKeepAliveActive = true;
      return true;
    } catch {
      return false;
    }
  }

  private async startSynchronizedBackgroundWav(
    profile: ChimeProfile,
    volume: number
  ): Promise<void> {
    if (typeof window === "undefined") return;

    // Use "playback" audio session so iOS permits continuous background execution
    try {
      const nav = navigator as NavigatorWithAudioSession;
      if (nav.audioSession) {
        nav.audioSession.type = "playback";
      }
    } catch {
      // Ignore
    }

    const nowMs = Date.now();
    const msUntilNextFullMinute = 60_000 - (nowMs % 60_000);
    const initialOffsetSec = msUntilNextFullMinute / 1000;

    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    const blobUrl = generateSynchronizedMinuteTrackBlobUrl(
      profile,
      volume,
      initialOffsetSec,
      20 // 20 full minutes per loop
    );
    this.currentBlobUrl = blobUrl;

    if (!this.bgAudioElement) {
      const audio = new Audio();
      audio.loop = true;
      audio.setAttribute("playsinline", "true");
      this.bgAudioElement = audio;
    }

    this.bgAudioElement.src = blobUrl;
    this.bgAudioElement.volume = 1.0;
    await this.bgAudioElement.play();

    // Register MediaSession so iOS Lockscreen keeps the audio pipeline alive indefinitely
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Minute Chime Aktiv (:00)",
          artist:
            CHIME_PROFILES.find((p) => p.id === profile)?.label ||
            "Signalton jede Minute",
          album: "Minute Chime iOS",
        });
      } catch {
        // Ignore
      }
    }
  }

  public preScheduleUpcomingMinutes(
    profile: ChimeProfile = this.currentProfile,
    volume: number = this.currentVolume
  ): void {
    this.currentProfile = profile;
    this.currentVolume = volume;
    if (this.isKeepAliveActive) {
      void this.startSynchronizedBackgroundWav(profile, volume);
    }
  }

  public stopKeepAlive(): void {
    this.isKeepAliveActive = false;
    if (this.bgAudioElement) {
      this.bgAudioElement.pause();
      this.bgAudioElement.removeAttribute("src");
      this.bgAudioElement.load();
    }
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  public isBackgroundStreamRunning(): boolean {
    return (
      this.isKeepAliveActive &&
      !!this.bgAudioElement &&
      !this.bgAudioElement.paused
    );
  }

  /**
   * Plays an immediate chime (for "Ton testen", activation confirmation, or when background stream is off).
   */
  public playChime(profile: ChimeProfile = "digital", volume = 0.85): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const safeVolume = Math.max(0.05, Math.min(1, volume));
    const startTime = ctx.currentTime;

    if (profile === "digital") {
      this.triggerBeep(ctx, 1046.5, startTime, 0.075, safeVolume * 0.45, "square");
      this.triggerBeep(
        ctx,
        1046.5,
        startTime + 0.11,
        0.085,
        safeVolume * 0.45,
        "square"
      );
    } else if (profile === "bell") {
      this.triggerBellNote(ctx, 528, startTime, 1.4, safeVolume * 0.65);
      this.triggerBellNote(ctx, 1056, startTime, 0.8, safeVolume * 0.25);
    } else if (profile === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, startTime);
      osc.frequency.exponentialRampToValueAtTime(60, startTime + 0.035);

      gain.gain.setValueAtTime(safeVolume * 0.8, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.045);
    }
  }

  private triggerBeep(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    type: OscillatorType
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    gain.gain.setValueAtTime(peakGain, startTime + duration - 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private triggerBellNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }
}

export const chimeAudio = new ChimeAudioEngine();
