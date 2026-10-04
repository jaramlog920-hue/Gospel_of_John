// 배경음 세 곡(사용자 요청 2026-10-04). 음원 파일 없이 Web Audio로 그때그때 연주한다.
// 설계 문서의 사운드 방향(칩튠 바탕에 수금·피리 느낌)을 따른다.
//  - 와서 보라: 타이틀·모닥불·일기·장 퀴즈. 수금 아르페지오와 피리, 느리고 따뜻하게(라장조).
//  - 갈릴리 길: 걷는 이야기 장면. 가볍게 튕기는 수금 반주에 칩튠 피리(사장조).
//  - 고요한 밤: 다락방(13–17장)과 수난(18–19장). 낮게 깔리는 소리와 드문 수금(가단조).
//    수난 장면은 설계 원칙 6에 따라 선율 없이 아주 작게만 연주한다.
import { audio, audioRunning, musicOut } from './engine.ts';

export type TrackId = 'come' | 'road' | 'night';

interface Track {
  bpm: number;
  /** 마디마다 화음: 첫 음은 베이스, 나머지 셋은 위 성부 */
  chords: string[];
  /** 8분음표 한 칸씩: 음 이름은 새 음, '-'는 앞 음을 이어서, '.'는 쉼 */
  melody: string;
  accomp: 'arp' | 'strum' | 'drone';
  lead: 'flute' | 'chip';
  volume: number;
}

const TRACKS: Record<TrackId, Track> = {
  come: {
    bpm: 76,
    chords: ['D3 A3 D4 F#4', 'B2 F#3 B3 D4', 'G2 D3 G3 B3', 'A2 E3 A3 C#4', 'D3 A3 D4 F#4', 'B2 F#3 B3 D4', 'E3 B3 E4 G4', 'A2 E3 A3 C#4'],
    melody: [
      'A4 - - - F#4 - A4 -',
      'B4 - - - D5 - C#5 B4',
      'A4 - - - G4 - F#4 -',
      'E4 - - - - - . .',
      'A4 - - - F#4 - A4 -',
      'B4 - D5 - F#5 - E5 D5',
      'E5 - - - D5 - B4 -',
      'C#5 - - - - - . .',
    ].join(' '),
    accomp: 'arp',
    lead: 'flute',
    volume: 0.8,
  },
  road: {
    bpm: 100,
    chords: ['G2 G3 B3 D4', 'C3 G3 C4 E4', 'G2 G3 B3 D4', 'D3 F#3 A3 D4', 'E2 G3 B3 E4', 'C3 G3 C4 E4', 'D3 F#3 A3 D4', 'G2 G3 B3 D4'],
    melody: [
      'D5 - B4 - G4 - B4 D5',
      'E5 - - - C5 - E5 -',
      'D5 - B4 - A4 - G4 -',
      'A4 - - - - - . .',
      'B4 - - G4 E4 - G4 B4',
      'C5 - - - E5 - D5 C5',
      'B4 - A4 - F#4 - A4 -',
      'G4 - - - - - . .',
    ].join(' '),
    accomp: 'strum',
    lead: 'chip',
    volume: 0.7,
  },
  night: {
    bpm: 60,
    chords: ['A2 C4 E4 A4', 'A2 C4 E4 A4', 'F2 A3 C4 F4', 'F2 A3 C4 F4', 'C3 E4 G4 C5', 'G2 B3 D4 G4', 'E2 B3 E4 G#4', 'E2 B3 E4 G#4'],
    melody: [
      '. . . . E5 - - -',
      'D5 - C5 - B4 - - -',
      'A4 - - - . . . .',
      '. . . . C5 - D5 -',
      'E5 - - - G5 - E5 -',
      'D5 - - - - - . .',
      'B4 - - - C5 - B4 -',
      'G#4 - - - - - . .',
    ].join(' '),
    accomp: 'drone',
    lead: 'flute',
    volume: 0.8,
  },
};

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'F#4' → 주파수 */
export function noteFreq(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`음 이름이 이상하다: ${name}`);
  const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

interface NoteEvent {
  step: number;
  len: number;
  freq: number;
}

/** 선율 문자열을 음 목록으로 */
export function parseMelody(melody: string): { events: NoteEvent[]; steps: number } {
  const tokens = melody.trim().split(/\s+/);
  const events: NoteEvent[] = [];
  tokens.forEach((t, i) => {
    if (t === '-') {
      const last = events[events.length - 1];
      if (last && last.step + last.len === i) last.len++;
      return;
    }
    if (t === '.') return;
    events.push({ step: i, len: 1, freq: noteFreq(t) });
  });
  return { events, steps: tokens.length };
}

// ---- 악기 ----

type Out = AudioNode;

function env(a: AudioContext, out: Out, t: number, peak: number, attack: number, hold: number, release: number) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(out);
  return { g, end: t + attack + hold + release + 0.05 };
}

function osc(a: AudioContext, type: OscillatorType, freq: number, t: number, end: number, dest: AudioNode) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.connect(dest);
  o.start(t);
  o.stop(end);
  return o;
}

/** 수금: 튕기고 길게 사라진다 */
function harp(a: AudioContext, out: Out, freq: number, t: number, vol: number) {
  const body = env(a, out, t, vol, 0.005, 0, 1.4);
  osc(a, 'triangle', freq, t, body.end, body.g);
  const shine = env(a, out, t, vol * 0.3, 0.005, 0, 0.45);
  osc(a, 'sine', freq * 2, t, shine.end, shine.g);
}

/** 피리: 부드럽게 들어와 살짝 떨린다 */
function flute(a: AudioContext, out: Out, freq: number, t: number, dur: number, vol: number) {
  const e = env(a, out, t, vol, 0.06, Math.max(0, dur - 0.06), 0.18);
  const main = osc(a, 'sine', freq, t, e.end, e.g);
  const breathy = a.createGain();
  breathy.gain.value = 0.22;
  breathy.connect(e.g);
  const edge = osc(a, 'triangle', freq, t, e.end, breathy);
  if (dur > 0.3) {
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = 5;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(freq * 0.006, t + Math.min(dur, 0.4));
    lfo.connect(depth);
    depth.connect(main.frequency);
    depth.connect(edge.frequency);
    lfo.start(t);
    lfo.stop(e.end);
  }
}

/** 칩튠 피리: 부드럽게 깎은 네모파 */
function chip(a: AudioContext, out: Out, freq: number, t: number, dur: number, vol: number) {
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  lp.connect(out);
  const e = env(a, lp, t, vol, 0.01, Math.max(0, dur - 0.05), 0.1);
  osc(a, 'square', freq, t, e.end, e.g);
}

function bass(a: AudioContext, out: Out, freq: number, t: number, dur: number, vol: number) {
  const e = env(a, out, t, vol, 0.01, Math.max(0, dur * 0.5), dur * 0.5 + 0.1);
  osc(a, 'triangle', freq, t, e.end, e.g);
}

/** 낮게 깔리는 소리 */
function pad(a: AudioContext, out: Out, freq: number, t: number, dur: number, vol: number) {
  const e = env(a, out, t, vol, 0.8, Math.max(0, dur - 0.8), 0.9);
  osc(a, 'sine', freq, t, e.end, e.g);
}

// ---- 연주 ----

interface Playing {
  id: TrackId;
  sparse: boolean;
  track: Track;
  chords: number[][];
  notes: NoteEvent[];
  steps: number;
  gain: GainNode;
  step: number;
  nextTime: number;
}

let playing: Playing | null = null;
let timer = 0;

function playStep(a: AudioContext, p: Playing, t: number) {
  const { track, step } = p;
  const sd = 60 / track.bpm / 2;
  const bar = Math.floor(step / 8);
  const inBar = step % 8;
  const [root, ...upper] = p.chords[bar % p.chords.length];
  const out = p.gain;

  if (track.accomp === 'arp') {
    if (inBar === 0) bass(a, out, root, t, sd * 8, 0.05);
    const tones = [...upper, upper[0] * 2];
    harp(a, out, tones[[0, 1, 2, 3, 2, 1, 2, 1][inBar]], t, 0.04);
  } else if (track.accomp === 'strum') {
    if (inBar === 0) bass(a, out, root, t, sd * 3, 0.06);
    if (inBar === 4) bass(a, out, root * 1.5, t, sd * 3, 0.05);
    if (inBar === 2 || inBar === 6) upper.forEach((f, k) => harp(a, out, f, t + k * 0.015, 0.022));
  } else {
    if (inBar === 0) {
      pad(a, out, root, t, sd * 8, 0.03);
      pad(a, out, root * 1.5, t, sd * 8, 0.018);
    }
    if (inBar === 0) harp(a, out, upper[2] * 2, t, p.sparse ? 0.022 : 0.03);
    if (inBar === 5 && !p.sparse) harp(a, out, upper[0] * 2, t, 0.022);
  }

  if (p.sparse) return;
  for (const n of p.notes) {
    if (n.step !== step) continue;
    const dur = n.len * sd * 0.95;
    if (track.lead === 'flute') flute(a, out, n.freq, t, dur, 0.045);
    else chip(a, out, n.freq, t, dur, 0.03);
  }
}

function tick() {
  const a = audio();
  if (!a || !playing || !audioRunning()) return;
  const p = playing;
  const sd = 60 / p.track.bpm / 2;
  // 탭을 떠났다 돌아오면 밀린 박자를 한꺼번에 치지 않고 지금부터 다시 시작한다.
  if (p.nextTime < a.currentTime) p.nextTime = a.currentTime + 0.05;
  while (p.nextTime < a.currentTime + 0.3) {
    playStep(a, p, p.nextTime);
    p.nextTime += sd;
    p.step = (p.step + 1) % p.steps;
  }
}

export const Music = {
  /** 곡을 바꾼다. 같은 곡이면 그대로 이어 간다. null이면 조용히 멈춘다. */
  play(id: TrackId | null, opts: { sparse?: boolean } = {}) {
    const sparse = !!opts.sparse;
    if (playing && id === playing.id && sparse === playing.sparse) return;
    const a = audio();
    const out = musicOut();
    if (!a || !out) return;
    if (playing) {
      const old = playing.gain;
      old.gain.cancelScheduledValues(a.currentTime);
      old.gain.setTargetAtTime(0.0001, a.currentTime, 0.35);
      window.setTimeout(() => old.disconnect(), 2500);
    }
    playing = null;
    if (!id) return;
    const track = TRACKS[id];
    const gain = a.createGain();
    const level = track.volume * (sparse ? 0.6 : 1);
    gain.gain.setValueAtTime(0.0001, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(level, a.currentTime + 1.5);
    gain.connect(out);
    const { events, steps } = parseMelody(track.melody);
    playing = {
      id,
      sparse,
      track,
      chords: track.chords.map((c) => c.split(' ').map(noteFreq)),
      notes: events,
      steps: Math.max(steps, track.chords.length * 8),
      gain,
      step: 0,
      nextTime: a.currentTime + 0.1,
    };
    if (!timer) timer = window.setInterval(tick, 60);
    tick();
  },
  /** 소리가 막 켜졌을 때(첫 터치) 바로 연주를 시작한다. */
  kick() {
    tick();
  },
  get current(): TrackId | null {
    return playing?.id ?? null;
  },
};

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];
export function trackOf(id: TrackId) {
  return TRACKS[id];
}
