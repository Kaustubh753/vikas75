export type TrackName = 'lobby' | 'challenge' | 'ticking' | 'drumroll' | 'winner';

// Web Audio API fallback tones when MP3 files are absent
const TONE_CONFIG: Record<TrackName, { freq: number; type: OscillatorType; loop: boolean; duration: number }> = {
  lobby:     { freq: 220,  type: 'sine',     loop: true,  duration: 999 },
  challenge: { freq: 440,  type: 'triangle', loop: false, duration: 1.5 },
  ticking:   { freq: 880,  type: 'square',   loop: true,  duration: 999 },
  drumroll:  { freq: 110,  type: 'sawtooth', loop: false, duration: 3   },
  winner:    { freq: 523,  type: 'sine',     loop: false, duration: 2   },
};

class MusicManager {
  private tracks = new Map<TrackName, HTMLAudioElement>();
  private current: TrackName | null = null;
  private _muted = false;
  private audioCtx: AudioContext | null = null;
  private toneOsc: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this._muted = localStorage.getItem('vikas75_muted') === 'true';
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

  private playTone(name: TrackName) {
    const ctx = this.getCtx();
    if (!ctx) return;
    this.stopTone();
    const cfg = TONE_CONFIG[name];
    try {
      // Resume context if suspended (browsers require user gesture)
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cfg.type;
      osc.frequency.value = cfg.freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      if (!cfg.loop) osc.stop(ctx.currentTime + cfg.duration);
      this.toneOsc = osc;
      this.toneGain = gain;
    } catch {
    }
  }

  private stopTone() {
    try { this.toneOsc?.stop(); } catch {}
    this.toneOsc?.disconnect();
    this.toneGain?.disconnect();
    this.toneOsc = null;
    this.toneGain = null;
  }

  private load(name: TrackName): HTMLAudioElement | null {
    if (this.tracks.has(name)) return this.tracks.get(name)!;
    try {
      const audio = new Audio(`/sounds/${name}.mp3`);
      audio.loop = ['lobby', 'ticking'].includes(name);
      audio.volume = 0.4;
      this.tracks.set(name, audio);
      return audio;
    } catch { return null; }
  }

  play(name: TrackName) {
    if (this._muted) return;
    if (this.current === name) return;
    this.stop();
    this.current = name;
    const audio = this.load(name);
    if (!audio) return; // no file — fail silently
    audio.currentTime = 0;
    audio.play().catch(() => { /* autoplay blocked or file missing — silent */ });
  }

  stop() {
    if (this.current) {
      const audio = this.tracks.get(this.current);
      if (audio) { audio.pause(); audio.currentTime = 0; }
      this.stopTone();
      this.current = null;
    }
  }

  get muted() { return this._muted; }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (typeof window !== 'undefined') localStorage.setItem('vikas75_muted', String(this._muted));
    if (this._muted) this.stop();
    return this._muted;
  }
}

let instance: MusicManager | null = null;
export function getMusicManager(): MusicManager {
  if (!instance) instance = new MusicManager();
  return instance;
}
