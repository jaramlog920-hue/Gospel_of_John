// 짧은 효과음. 음원 파일 없이 Web Audio로 만든다(첫 터치 뒤에 소리가 난다).
// 모든 효과음은 효과음 버스를 거쳐서 설정의 "효과음" 크기를 따른다.
import { audio, sfxOut } from './engine.ts';

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
  const out = sfxOut();
  if (!a || !out || a.state !== 'running') return;
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
  osc.connect(gain).connect(pan).connect(out);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

let noiseBuf: AudioBuffer | null = null;

/** 걸러 낸 잡음(종이·물·바람 소리) */
function noise(ms: number, o: { freq: number; q?: number; volume?: number; to?: number; delay?: number }) {
  const a = audio();
  const out = sfxOut();
  if (!a || !out || a.state !== 'running') return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = a.currentTime + (o.delay ?? 0) / 1000;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = o.q ?? 1.2;
  filter.frequency.setValueAtTime(o.freq, t0);
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t0 + ms / 1000);
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(o.volume ?? 0.08, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  src.connect(filter).connect(gain).connect(out);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + ms / 1000 + 0.02);
}

/** 수금을 한 번 튕긴 소리 */
function pluck(freq: number, delay = 0, volume = 0.05) {
  tone(freq, 700, { type: 'triangle', volume, delay });
  tone(freq * 2, 260, { type: 'sine', volume: volume * 0.35, delay });
}

/** 자주 쓰는 소리 */
export const Sfx = {
  tick: () => tone(880, 40, { volume: 0.03 }),
  good: () => (tone(660, 90), tone(990, 120, { delay: 80 })),
  miss: () => tone(220, 160, { type: 'triangle', to: 140 }),
  splash: () => (tone(500, 220, { type: 'sawtooth', to: 120, volume: 0.02 }), noise(260, { freq: 1800, to: 500, volume: 0.06 })),
  pour: () => tone(300, 300, { type: 'triangle', to: 700, volume: 0.04 }),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 160, { delay: i * 110, type: 'triangle' })),
  step: () => tone(120, 50, { type: 'triangle', volume: 0.03 }),
  bleat: (f = 420, pan = 0) => tone(f, 260, { type: 'sawtooth', to: f * 0.8, volume: 0.04, pan }),
  call: () => [392, 523, 440].forEach((f, i) => tone(f, 220, { delay: i * 230, type: 'triangle', volume: 0.06 })),
  /** 선택지에서 줄을 옮길 때 */
  move: () => tone(660, 30, { type: 'triangle', volume: 0.025 }),
  /** 선택지를 골랐을 때 */
  select: () => (tone(587, 60, { type: 'triangle', volume: 0.04 }), tone(880, 90, { type: 'triangle', volume: 0.04, delay: 50 })),
  /** 대화를 넘길 때 */
  next: () => tone(523, 35, { type: 'triangle', volume: 0.02 }),
  /** 두루마리를 펼칠 때: 종이 스치는 소리와 수금 한 줄 */
  scroll: () => (noise(320, { freq: 2600, to: 900, q: 0.8, volume: 0.05 }), pluck(587, 120, 0.035), pluck(880, 220, 0.03)),
  /** 두루마리를 덮을 때 */
  scrollClose: () => noise(200, { freq: 1200, to: 2400, q: 0.8, volume: 0.035 }),
  /** 물방울 떨어지는 소리(9장 실로암). near: 0 멀다 ~ 1 아주 가깝다. pan: -1 왼쪽 ~ 1 오른쪽 */
  drip: (near: number, pan: number) => {
    const f = 700 + near * 900;
    tone(f, 110, { type: 'sine', to: f * 1.8, pan, volume: 0.05 + near * 0.05 });
    noise(140, { freq: 1500 + near * 1500, to: 600, q: 2, volume: 0.03 + near * 0.04 });
  },
  /** 장 제목 카드 */
  chime: () => [587, 740, 880, 1175].forEach((f, i) => pluck(f, i * 140, 0.04)),
};
