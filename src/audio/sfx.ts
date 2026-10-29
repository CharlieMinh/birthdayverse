/** Small synthesized sound effects, so V1 needs no effect files. */

let noiseBuffer: AudioBuffer | null = null

function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer
  const length = ctx.sampleRate * 1.5
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return noiseBuffer
}

export type EffectName = 'chime' | 'whoosh' | 'pop' | 'sparkle'

export function playEffect(ctx: AudioContext, out: AudioNode, name: EffectName): void {
  const t = ctx.currentTime + 0.01
  switch (name) {
    case 'chime':
      // Rising bell triad.
      ;[880, 1108.73, 1318.51].forEach((f, i) => bell(ctx, out, f, t + i * 0.09, 0.18))
      break
    case 'sparkle':
      for (let i = 0; i < 6; i++) bell(ctx, out, 1600 + Math.random() * 1800, t + i * 0.06, 0.05)
      break
    case 'whoosh': {
      const src = ctx.createBufferSource()
      src.buffer = noise(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 0.8
      filter.frequency.setValueAtTime(400, t)
      filter.frequency.exponentialRampToValueAtTime(2400, t + 0.35)
      filter.frequency.exponentialRampToValueAtTime(300, t + 1.1)
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, t)
      env.gain.linearRampToValueAtTime(0.5, t + 0.15)
      env.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
      src.connect(filter).connect(env).connect(out)
      src.start(t)
      src.stop(t + 1.3)
      break
    }
    case 'pop': {
      // Low thump plus a crackle tail.
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.frequency.setValueAtTime(140, t)
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.25)
      g.gain.setValueAtTime(0.35, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      osc.connect(g).connect(out)
      osc.start(t)
      osc.stop(t + 0.32)

      const src = ctx.createBufferSource()
      src.buffer = noise(ctx)
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 3000
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(0, t + 0.05)
      ng.gain.linearRampToValueAtTime(0.12, t + 0.08)
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
      src.connect(hp).connect(ng).connect(out)
      src.start(t, Math.random())
      src.stop(t + 0.75)
      break
    }
  }
}

function bell(ctx: AudioContext, out: AudioNode, freq: number, at: number, level: number): void {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(level, at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, at + 1.4)
  osc.connect(g).connect(out)
  osc.start(at)
  osc.stop(at + 1.5)
}
