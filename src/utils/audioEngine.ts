/**
 * Solar Eclipse 2026 — Totality Audio Ambience Engine
 * Synthesizes immersive audio without requiring any audio assets.
 * Uses Web Audio API for all sounds (oscillators, noise, reverb).
 */

type EclipsePhase = 'pre-partial' | 'partial' | 'approaching-totality' | 'totality' | 'egress';

interface AudioEngineOptions {
  onPhaseChange?: (phase: EclipsePhase) => void;
}

// ─── Audio Engine Class ───────────────────────────────────────────────────────

export class SolarEclipseAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambianceOsc: OscillatorNode | null = null;
  private ambianceGain: GainNode | null = null;
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private isRunning = false;
  private currentPhase: EclipsePhase = 'pre-partial';
  private options: AudioEngineOptions;

  constructor(options: AudioEngineOptions = {}) {
    this.options = options;
  }

  /** Initialize Web Audio context (must be called after user gesture) */
  async init(): Promise<void> {
    if (this.ctx) return;

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.ctx.resume();

      // Master gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Convolution reverb (simulate open field)
      this.reverb = this.createReverb(2.0);
      if (this.reverb) {
        this.reverb.connect(this.masterGain);
      }

      // Soft drone ambiance (nature feel — sub-bass rumble)
      this.rumbleOsc = this.ctx.createOscillator();
      this.rumbleGain = this.ctx.createGain();
      this.rumbleOsc.type = 'sine';
      this.rumbleOsc.frequency.setValueAtTime(40, this.ctx.currentTime);
      this.rumbleGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.rumbleOsc.connect(this.rumbleGain);
      this.rumbleGain.connect(this.masterGain);
      this.rumbleOsc.start();

      // Soft high melody (harmonic series — corona shimmer)
      this.ambianceOsc = this.ctx.createOscillator();
      this.ambianceGain = this.ctx.createGain();
      this.ambianceOsc.type = 'triangle';
      this.ambianceOsc.frequency.setValueAtTime(220, this.ctx.currentTime);
      this.ambianceGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.ambianceOsc.connect(this.ambianceGain);
      this.ambianceGain.connect(this.masterGain);
      this.ambianceOsc.start();

      this.isRunning = true;
    } catch (err) {
      console.warn('[AudioEngine] Web Audio API init failed:', err);
    }
  }

  /** Update audio based on current eclipse phase/obscuration */
  update(obscurationPercent: number, phase: string): void {
    if (!this.ctx || !this.isRunning) return;

    const now = this.ctx.currentTime;
    const newPhase = this.mapPhase(obscurationPercent, phase);

    if (newPhase !== this.currentPhase) {
      this.currentPhase = newPhase;
      this.options.onPhaseChange?.(newPhase);
      this.transitionToPhase(newPhase, now);
    } else {
      // Continuous modulation during partial & bio-acoustic twilight chirps
      if (newPhase === 'partial' || newPhase === 'approaching-totality' || newPhase === 'totality') {
        const t = obscurationPercent / 100;
        this.rumbleOsc?.frequency.setTargetAtTime(40 + t * 20, now, 2.0);
        this.rumbleGain?.gain.setTargetAtTime(0.04 + t * 0.08, now, 3.0);

        // Bio-acoustic cricket chirp pulses at >85% obscuration
        if (t > 0.85 && Math.random() < 0.25) {
          this.triggerCricketChirp(now);
        }
      }
    }
  }

  /** Synthesize dusk cricket chirp bio-acoustic pulse */
  private triggerCricketChirp(now: number): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4500 + Math.random() * 500, now);
      
      // Pulsed envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.015, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (_) {}
  }

  /** Fade master volume in */
  enable(): void {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setTargetAtTime(0.6, this.ctx.currentTime, 1.5);
  }

  /** Fade master volume out */
  disable(): void {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 1.0);
  }

  /** Suspend audio context to save CPU when panel is hidden */
  suspend(): void {
    this.ctx?.suspend();
  }

  /** Resume audio context */
  resume(): void {
    this.ctx?.resume();
  }

  /** Cleanup all audio nodes */
  destroy(): void {
    try {
      this.ambianceOsc?.stop();
      this.rumbleOsc?.stop();
      this.ctx?.close();
    } catch (_) {}
    this.ctx = null;
    this.isRunning = false;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private mapPhase(obscuration: number, phase: string): EclipsePhase {
    if (phase === 'TOTALITY!' || phase === 'Diamond Ring!') return 'totality';
    if (obscuration > 80) return 'approaching-totality';
    if (obscuration > 5) return 'partial';
    if (obscuration > 0) return 'pre-partial';
    return 'pre-partial';
  }

  private transitionToPhase(phase: EclipsePhase, now: number): void {
    switch (phase) {
      case 'pre-partial':
        this.rumbleGain?.gain.setTargetAtTime(0.02, now, 3.0);
        this.ambianceGain?.gain.setTargetAtTime(0.0, now, 2.0);
        this.rumbleOsc?.frequency.setTargetAtTime(40, now, 4.0);
        break;

      case 'partial':
        this.rumbleGain?.gain.setTargetAtTime(0.05, now, 3.0);
        this.ambianceGain?.gain.setTargetAtTime(0.01, now, 3.0);
        this.ambianceOsc?.frequency.setTargetAtTime(185, now, 4.0); // D-flat minor feel
        break;

      case 'approaching-totality':
        // Dramatic drop in brightness → haunting tone
        this.rumbleGain?.gain.setTargetAtTime(0.12, now, 2.0);
        this.ambianceGain?.gain.setTargetAtTime(0.04, now, 2.0);
        this.ambianceOsc?.frequency.setTargetAtTime(147, now, 3.0); // D3 — somber
        this.rumbleOsc?.frequency.setTargetAtTime(55, now, 2.0);
        // Play a gentle rising arpeggio cue
        this.playArpeggioRise(now);
        break;

      case 'totality':
        // Near-silence with deep resonant hum (corona moment)
        this.rumbleGain?.gain.setTargetAtTime(0.18, now, 0.5);
        this.ambianceGain?.gain.setTargetAtTime(0.06, now, 1.0);
        this.ambianceOsc?.frequency.setTargetAtTime(110, now, 1.5); // A2 — deep cosmic
        this.rumbleOsc?.frequency.setTargetAtTime(27.5, now, 1.0); // A0 sub-bass
        // Chime for totality entry
        this.playTotalityChime(now);
        break;

      case 'egress':
        // Gradual return to brightness
        this.rumbleGain?.gain.setTargetAtTime(0.05, now, 4.0);
        this.ambianceGain?.gain.setTargetAtTime(0.015, now, 4.0);
        this.ambianceOsc?.frequency.setTargetAtTime(220, now, 5.0);
        this.rumbleOsc?.frequency.setTargetAtTime(40, now, 4.0);
        break;
    }
  }

  /** Create a synthetic impulse response for reverb */
  private createReverb(duration: number): ConvolverNode | null {
    if (!this.ctx) return null;
    try {
      const convolver = this.ctx.createConvolver();
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * duration;
      const impulse = this.ctx.createBuffer(2, length, sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.0);
        }
      }
      convolver.buffer = impulse;
      return convolver;
    } catch (_) {
      return null;
    }
  }

  /** Rising arpeggio cue as totality approaches */
  private playArpeggioRise(now: number): void {
    if (!this.ctx || !this.masterGain) return;
    const freqs = [220, 277, 330, 440];
    freqs.forEach((freq, i) => {
      try {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.025, now + i * 0.4 + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + i * 0.4 + 1.2);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.4);
        osc.stop(now + i * 0.4 + 1.5);
      } catch (_) {}
    });
  }

  /** Single resonant bell chime for totality contact */
  private playTotalityChime(now: number): void {
    if (!this.ctx || !this.masterGain) return;
    const chimeFreqs = [523.25, 659.25, 783.99]; // C5-E5-G5 major triad
    chimeFreqs.forEach((freq, i) => {
      try {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 3.0);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 3.5);
      } catch (_) {}
    });
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _engineInstance: SolarEclipseAudioEngine | null = null;

export function getAudioEngine(options?: AudioEngineOptions): SolarEclipseAudioEngine {
  if (!_engineInstance) {
    _engineInstance = new SolarEclipseAudioEngine(options);
  }
  return _engineInstance;
}
