// MusicManager — loads audio from /public/sounds/, fails silently if files missing
export type TrackName = 'lobby' | 'challenge' | 'ticking' | 'drumroll' | 'winner' | 'correct';

class MusicManager {
  private tracks = new Map<TrackName, HTMLAudioElement>();
  private current: TrackName | null = null;
  private _muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this._muted = localStorage.getItem('vikas75_muted') === 'true';
    }
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
    const audio = this.load(name);
    if (!audio) return;
    this.current = name;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  stop() {
    if (this.current) {
      const audio = this.tracks.get(this.current);
      if (audio) { audio.pause(); audio.currentTime = 0; }
      this.current = null;
    }
  }

  get muted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('vikas75_muted', String(this._muted));
    }
    if (this._muted) this.stop();
    return this._muted;
  }
}

let instance: MusicManager | null = null;
export function getMusicManager(): MusicManager {
  if (!instance) instance = new MusicManager();
  return instance;
}
