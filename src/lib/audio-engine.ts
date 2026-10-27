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

class ChimeAudioEngine {
  private ctx: AudioContext | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private isKeepAliveActive = false;

  /**
   * Always sets iOS AudioSession to "ambient" so the web app NEVER pauses
   * Spotify, Apple Music, or YouTube.
   */
  private configureAmbientAudioSession(): void {
    if (typeof navigator === "undefined") return;
    try {
      const nav = navigator as NavigatorWithAudioSession;
      if (nav.audioSession) {
        nav.audioSession.type = "ambient";
      }
    } catch {
      // Ignore if unsupported
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    this.configureAmbientAudioSession();

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
        // Ignore
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

  public async unlockAndStartKeepAlive(
    _profile: ChimeProfile = "digital",
    _volume = 0.85
  ): Promise<boolean> {
    void _profile;
    void _volume;
    this.configureAmbientAudioSession();
    const ctx = this.getContext();
    if (!ctx) return false;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      this.isKeepAliveActive = true;
      return true;
    } catch {
      return false;
    }
  }

  public preScheduleUpcomingMinutes(
    _profile?: ChimeProfile,
    _volume?: number,
    _minutesCount?: number
  ): void {
    void _profile;
    void _volume;
    void _minutesCount;
  }

  public stopKeepAlive(): void {
    this.isKeepAliveActive = false;
  }

  public isBackgroundStreamRunning(): boolean {
    return false;
  }

  public playChime(profile: ChimeProfile = "digital", volume = 0.85): void {
    this.configureAmbientAudioSession();
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
