export type TrackName = 'lobby' | 'challenge' | 'ticking' | 'drumroll' | 'winner';

/**
 * Sound-effects manager for the projector phase stings (challenge / ticking /
 * drumroll / winner) and the player-side SFX mute.
 *
 * Each effect tries its real `/public/sounds/<name>.mp3` first, so a sound
 * designer can drop polished audio in later with zero code changes. If the file
 * is missing (404), it falls back to a small procedural Web-Audio synth so the
 * projector is never silent. Autoplay-blocked playback (no user gesture yet) is
 * left silent on purpose — it resumes once the browser allows audio.
 *
 * (Lobby background music is handled separately by LobbyMusicManager in
 * music-manager.ts; this class only synthesises the short game-show stings.)
 */
class MusicManager {
  private current: TrackName | null = null;
  private _muted = false;
  private audioCtx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private synthNodes: AudioNode[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Shared "sound on/off" key with the lobby music manager. Sound is off by default;
      // muted is simply the inverse of "sound on", so the single user toggle controls both.
      this._muted = localStorage.getItem('vikas75-sound-on') !== 'true';
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.audioCtx) {
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) this.audioCtx = new Ctx();
      } catch { return null; }
    }
    return this.audioCtx;
  }

  play(name: TrackName) {
    if (this._muted) return;
    if (this.current === name) return;
    this.stop();
    this.current = name;

    // Try the real mp3 first; fall back to the procedural synth if it's absent.
    let audio: HTMLAudioElement;
    try {
      audio = new Audio(`/sounds/${name}.mp3`);
    } catch {
      this.playSynth(name);
      return;
    }
    audio.loop = name === 'ticking' || name === 'lobby';
    audio.volume = 0.4;
    this.currentAudio = audio;

    let handled = false;
    const fallback = () => {
      if (handled) return;
      handled = true;
      if (this.current === name) {
        this.currentAudio = null;
        this.playSynth(name);
      }
    };
    audio.addEventListener('error', fallback, { once: true });
    audio.play().catch(() => {
      // Missing source → synth. Autoplay-blocked (gesture needed) → stay silent.
      if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fallback();
    });
  }

  stop() {
    if (this.currentAudio) {
      try { this.currentAudio.pause(); this.currentAudio.currentTime = 0; } catch {}
      this.currentAudio = null;
    }
    this.stopSynth();
    this.current = null;
  }

  get muted() { return this._muted; }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  /**
   * Set the muted state explicitly and persist the shared "sound on" preference.
   * Used so the lobby-music toggle and the SFX mute stay in lockstep off one key.
   */
  setMuted(muted: boolean) {
    this._muted = muted;
    if (typeof window !== 'undefined') localStorage.setItem('vikas75-sound-on', String(!muted));
    if (this._muted) this.stop();
  }

  // ── Procedural synthesis ───────────────────────────────────────────────────

  private playSynth(name: TrackName) {
    const ctx = this.getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    this.stopSynth();

    switch (name) {
      case 'challenge':
        // Quick two-note rising fanfare sting.
        this.note(659.25, 'triangle', 0, 0.18, 0.09);   // E5
        this.note(987.77, 'triangle', 0.12, 0.5, 0.08); // B5
        break;
      case 'winner': {
        // Major arpeggio (C–E–G–C) resolving into a held chord.
        const arp = [523.25, 659.25, 783.99, 1046.5];
        arp.forEach((f, i) => this.note(f, 'triangle', i * 0.12, 0.35, 0.08));
        [523.25, 659.25, 783.99].forEach((f) => this.note(f, 'sine', 0.5, 1.2, 0.05));
        break;
      }
      case 'drumroll':
        this.noiseRoll(2.6);
        break;
      case 'ticking':
        // Soft clock tick once per second until the phase changes.
        this.note(1100, 'square', 0, 0.04, 0.045);
        this.tickInterval = setInterval(() => this.note(1100, 'square', 0, 0.04, 0.045), 1000);
        break;
      case 'lobby':
        // Lobby music has a real mp3 and its own manager — no synth equivalent.
        break;
    }
  }

  /** Schedule a single enveloped oscillator note. */
  private note(freq: number, type: OscillatorType, startOffset: number, duration: number, peak: number) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    try { osc.start(t0); osc.stop(t0 + duration + 0.05); } catch {}
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };
    this.synthNodes.push(osc, gain);
  }

  /** A building band-passed white-noise roll that swells into a final accent. */
  private noiseRoll(duration: number) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * (duration + 0.3)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.7;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.05, t0 + duration * 0.85); // swell
    gain.gain.exponentialRampToValueAtTime(0.11, t0 + duration);        // accent
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.2);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    try { src.start(t0); src.stop(t0 + duration + 0.25); } catch {}
    src.onended = () => { try { src.disconnect(); bp.disconnect(); gain.disconnect(); } catch {} };
    this.synthNodes.push(src, bp, gain);
  }

  private stopSynth() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    for (const node of this.synthNodes) {
      try { (node as unknown as { stop?: () => void }).stop?.(); } catch {}
      try { node.disconnect(); } catch {}
    }
    this.synthNodes = [];
  }
}

let instance: MusicManager | null = null;
export function getMusicManager(): MusicManager {
  if (!instance) instance = new MusicManager();
  return instance;
}
