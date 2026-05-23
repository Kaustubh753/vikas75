/**
 * Singleton lobby music manager — handles only /public/sounds/lobby.mp3.
 * The module-level instance persists across Next.js client-side navigation
 * so the HTMLAudioElement is never destroyed.
 */

const LOBBY_TRACK = '/sounds/lobby.mp3';
const STORAGE_KEY = 'vikas75-music-enabled';
const FADE_IN_DURATION = 2000;  // ms
const FADE_OUT_DURATION = 3000; // ms
const MAX_VOLUME = 0.4;
const FADE_STEPS = 20;

class LobbyMusicManager {
  private audio: HTMLAudioElement | null = null;
  private _enabled: boolean;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private _forceMuted = false;

  constructor() {
    try {
      // Default: off — stored 'true' means the user explicitly turned it on
      this._enabled = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      this._enabled = false;
    }
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio(LOBBY_TRACK);
      this.audio.loop = true;
      this.audio.volume = 0;
    }
    return this.audio;
  }

  private clearFade() {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private doFadeIn() {
    const audio = this.getAudio();
    this.clearFade();
    audio.volume = 0;
    try {
      audio.play().catch(() => {/* autoplay blocked — silently ignore */});
    } catch {
      return;
    }
    const interval = FADE_IN_DURATION / FADE_STEPS;
    const increment = MAX_VOLUME / FADE_STEPS;
    this.fadeTimer = setInterval(() => {
      if (!this.audio) { this.clearFade(); return; }
      const next = Math.min(this.audio.volume + increment, MAX_VOLUME);
      this.audio.volume = next;
      if (next >= MAX_VOLUME) this.clearFade();
    }, interval);
  }

  private doFadeOut(callback?: () => void) {
    const audio = this.getAudio();
    this.clearFade();
    if (audio.paused) { callback?.(); return; }
    const startVol = audio.volume || MAX_VOLUME;
    const interval = FADE_OUT_DURATION / FADE_STEPS;
    const decrement = startVol / FADE_STEPS;
    this.fadeTimer = setInterval(() => {
      if (!this.audio) { this.clearFade(); callback?.(); return; }
      const next = Math.max(this.audio.volume - decrement, 0);
      this.audio.volume = next;
      if (next <= 0) {
        this.audio.pause();
        this.audio.volume = 0;
        this.clearFade();
        callback?.();
      }
    }, interval);
  }

  /**
   * Called by the projector — starts music regardless of the user-enabled preference.
   * Used when the big screen should always play during lobby.
   */
  autoPlay(): void {
    if (this._forceMuted) return;
    const audio = this.getAudio();
    if (!audio.paused) return; // already playing
    this.doFadeIn();
  }

  /**
   * Called by landing page or player phone — respects the enabled preference.
   */
  play(): void {
    if (!this._enabled || this._forceMuted) return;
    const audio = this.getAudio();
    if (!audio.paused) return;
    this.doFadeIn();
  }

  /**
   * Flip the enabled state. Fades in or out accordingly.
   * Returns the new enabled value.
   */
  toggle(): boolean {
    this._enabled = !this._enabled;
    try {
      localStorage.setItem(STORAGE_KEY, String(this._enabled));
    } catch { /* ignore */ }
    if (this._enabled && !this._forceMuted) {
      this.doFadeIn();
    } else {
      this.doFadeOut();
    }
    return this._enabled;
  }

  /** Remote mute/unmute from host via Pusher music:toggle event. */
  forceMute(muted: boolean): void {
    this._forceMuted = muted;
    if (muted) {
      this.doFadeOut();
    } else {
      // Resume only if the user-enabled preference allows it (or autoPlay will be used by projector)
      if (this._enabled) {
        const audio = this.getAudio();
        if (audio.paused) this.doFadeIn();
      }
    }
  }

  /** Fade out and stop. Called when leaving the lobby phase. */
  stop(): void {
    this.doFadeOut();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }
}

// Module-level singleton — survives Next.js client-side navigation
let instance: LobbyMusicManager | null = null;

export function getLobbyMusic(): LobbyMusicManager {
  if (typeof window === 'undefined') {
    // SSR: return a no-op stub so imports don't crash during server render
    return {
      autoPlay:   () => {},
      play:       () => {},
      toggle:     () => false,
      forceMute:  () => {},
      stop:       () => {},
      enabled:    false,
      isPlaying:  () => false,
    } as unknown as LobbyMusicManager;
  }
  if (!instance) instance = new LobbyMusicManager();
  return instance;
}
