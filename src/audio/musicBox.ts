/**
 * Fallback soundtrack: a synthesized music-box "Happy Birthday" (public domain
 * melody) over a soft pad. Used when no music file is configured or it fails.
 * Scheduling follows the standard Web Audio look-ahead pattern, so it pauses
 * for free when the AudioContext is suspended.
 */

const NOTE: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  C3: 130.81, F3: 174.61, G3: 196.0, E3: 164.81, A3: 220.0,
}

type Step = [note: string | null, beats: number]

// 3/4 time. Pickup notes are dotted-eighth + sixteenth.
const MELODY: Step[] = [
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
  ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
  ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3],
  [null, 3],
]

// Pad chords as [beat offset, notes], aligned to the melody above.
const PAD: Array<[number, string[]]> = [
  [1, ['C3', 'E3', 'G3']], [4, ['G3', 'B4', 'F4']],
  [7, ['G3', 'B4', 'F4']], [10, ['C3', 'E3', 'G3']],
  [13, ['C3', 'E3', 'G3']], [16, ['F3', 'A3', 'C4']],
  [20, ['C3', 'E3', 'G3']], [22, ['G3', 'B4', 'F4']], [24, ['C3', 'E3', 'G3']],
]

const BPM = 84
const LOOKAHEAD = 0.4

export class MusicBox {
  private timer: number | null = null
  private nextTime = 0
  private stepIndex = 0
  private loopStart = 0
  private loopBeats = MELODY.reduce((sum, [, b]) => sum + b, 0)
  private padIndex = 0
  private readonly beat = 60 / BPM

  constructor(private ctx: AudioContext, private out: AudioNode) {}

  start(): void {
    if (this.timer !== null) return
    this.stepIndex = 0
    this.padIndex = 0
    this.loopStart = this.ctx.currentTime + 0.1
    this.nextTime = this.loopStart
    this.timer = window.setInterval(() => this.schedule(), 100)
    this.schedule()
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  private schedule(): void {
    const horizon = this.ctx.currentTime + LOOKAHEAD
    while (this.nextTime < horizon) {
      const [note, beats] = MELODY[this.stepIndex]
      if (note) this.pluck(NOTE[note], this.nextTime)

      // Pad chords that fall inside this step.
      const beatInLoop = (this.nextTime - this.loopStart) / this.beat
      while (this.padIndex < PAD.length && PAD[this.padIndex][0] <= beatInLoop + 1e-3) {
        const [, chord] = PAD[this.padIndex]
        chord.forEach((n) => this.pad(NOTE[n] / 2, this.nextTime, this.beat * 3.2))
        this.padIndex++
      }

      this.nextTime += beats * this.beat
      this.stepIndex++
      if (this.stepIndex >= MELODY.length) {
        this.stepIndex = 0
        this.padIndex = 0
        this.loopStart = this.loopStart + this.loopBeats * this.beat
      }
    }
  }

  /** Music-box tine: bright attack, fast decay, a touch of inharmonic shimmer. */
  private pluck(freq: number, at: number): void {
    const { ctx } = this
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(0.32, at + 0.005)
    env.gain.exponentialRampToValueAtTime(0.001, at + 1.6)
    env.connect(this.out)

    for (const [mult, level, type] of [
      [1, 1, 'sine'],
      [2, 0.25, 'sine'],
      [4.2, 0.08, 'triangle'],
    ] as const) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq * mult
      g.gain.value = level
      osc.connect(g).connect(env)
      osc.start(at)
      osc.stop(at + 1.7)
    }
  }

  private pad(freq: number, at: number, length: number): void {
    const { ctx } = this
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(0.05, at + length * 0.35)
    env.gain.linearRampToValueAtTime(0, at + length)
    osc.connect(env).connect(this.out)
    osc.start(at)
    osc.stop(at + length + 0.05)
  }
}
