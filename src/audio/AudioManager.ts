import type { Settings } from "../core/types";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private duck: GainNode | null = null;
  private bgmNodes: AudioNode[] = [];
  private started = false;

  unlock(): void {
    const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) this.ctx = new Ctx();
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this.ensureGraph();
  }

  apply(settings: Settings): void {
    this.ensureGraph();
    if (!this.bgmGain || !this.sfxGain) return;
    const mute = settings.muted ? 0 : 1;
    this.bgmGain.gain.value = settings.bgmVolume * mute;
    this.sfxGain.gain.value = settings.sfxVolume * mute;
  }

  startBgm(): void {
    this.unlock();
    if (!this.ctx || !this.duck || this.started) return;
    this.started = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.7;
    filter.connect(this.duck);

    const makeOsc = (freq: number, type: OscillatorType, gain: number): void => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      this.bgmNodes.push(osc, g);
    };

    makeOsc(110, "sawtooth", 0.045);
    makeOsc(110 * 1.005, "triangle", 0.04);
    makeOsc(220, "sine", 0.02);

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.bgmNodes.push(lfo, lfoGain, filter);
  }

  stopBgm(): void {
    for (const node of this.bgmNodes) {
      if (node instanceof OscillatorNode) {
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
      }
      node.disconnect();
    }
    this.bgmNodes = [];
    this.started = false;
  }

  setDuck(amount: number): void {
    if (!this.duck || !this.ctx) return;
    this.duck.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.08);
  }

  playTap(): void {
    this.blip(880, 0.045, "square", 0.08);
  }

  playEvolve(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(196, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046, this.ctx.currentTime + 0.7);
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.85);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.9);
  }

  private blip(freq: number, seconds: number, type: OscillatorType, volume: number): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + seconds);
  }

  private ensureGraph(): void {
    if (!this.ctx || this.master) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.duck = this.ctx.createGain();
    this.duck.gain.value = 1;
    this.bgmGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.duck.connect(this.bgmGain);
  }
}

export function pulseHaptic(ms: number, enabled: boolean): void {
  if (!enabled || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(ms);
}
