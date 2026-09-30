// 짧은 효과음. 음원 파일 없이 Web Audio로 만든다(첫 터치 뒤에 소리가 난다).
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  volume?: number;
  /** -1 왼쪽 ~ 1 오른쪽 */
  pan?: number;
  /** 끝 주파수(미끄러지는 소리) */
  to?: number;
  delay?: number;
}

export function tone(freq: number, ms: number, o: ToneOpts = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + (o.delay ?? 0) / 1000;
  const osc = a.createOscillator();
  const gain = a.createGain();
  const pan = a.createStereoPanner();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + ms / 1000);
  gain.gain.setValueAtTime(o.volume ?? 0.06, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  pan.pan.value = o.pan ?? 0;
  osc.connect(gain).connect(pan).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

/** 자주 쓰는 소리 */
export const Sfx = {
  tick: () => tone(880, 40, { volume: 0.03 }),
  good: () => (tone(660, 90), tone(990, 120, { delay: 80 })),
  miss: () => tone(220, 160, { type: 'triangle', to: 140 }),
  splash: () => tone(500, 220, { type: 'sawtooth', to: 120, volume: 0.03 }),
  pour: () => tone(300, 300, { type: 'triangle', to: 700, volume: 0.04 }),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 160, { delay: i * 110, type: 'triangle' })),
  step: () => tone(120, 50, { type: 'triangle', volume: 0.03 }),
  bleat: (f = 420, pan = 0) => tone(f, 260, { type: 'sawtooth', to: f * 0.8, volume: 0.04, pan }),
  call: () => [392, 523, 440].forEach((f, i) => tone(f, 220, { delay: i * 230, type: 'triangle', volume: 0.06 })),
};
