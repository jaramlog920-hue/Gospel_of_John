// 성경 본문 로더. 본문은 data/john_krv.json 한 곳에서만 읽는다(설계 원칙 1).
// 씬과 대사 데이터에는 본문 문자열 대신 참조 키("john:6:11")만 둔다.
import raw from '../../data/john_krv.json';

export type VerseKey = `john:${number}:${number}`;

export interface VerseEntry {
  readonly ch: number;
  readonly v: number;
  readonly text: string;
}

const table = new Map<string, VerseEntry>();
for (const x of raw as VerseEntry[]) table.set(`${x.ch}:${x.v}`, Object.freeze({ ch: x.ch, v: x.v, text: x.text }));

function get(ch: number, v: number): VerseEntry {
  const entry = table.get(`${ch}:${v}`);
  if (!entry) throw new Error(`없는 절: 요 ${ch}:${v}`);
  return entry;
}

function parseKey(key: string): { ch: number; v: number } {
  const m = /^john:(\d+):(\d+)$/.exec(key);
  if (!m) throw new Error(`잘못된 참조 키: ${key}`);
  return { ch: Number(m[1]), v: Number(m[2]) };
}

/** "john:6:10-13"처럼 범위도 받는다. */
function resolve(ref: string): VerseEntry[] {
  const m = /^john:(\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) throw new Error(`잘못된 참조: ${ref}`);
  const ch = Number(m[1]);
  const from = Number(m[2]);
  const to = m[3] ? Number(m[3]) : from;
  const out: VerseEntry[] = [];
  for (let v = from; v <= to; v++) out.push(get(ch, v));
  return out;
}

/** 화면 표기: 요 6:11, 요 6:10–13 */
function label(ref: string): string {
  const m = /^john:(\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) throw new Error(`잘못된 참조: ${ref}`);
  return m[3] ? `요 ${m[1]}:${m[2]}–${m[3]}` : `요 ${m[1]}:${m[2]}`;
}

export const Scripture = Object.freeze({
  get,
  parseKey,
  resolve,
  label,
  count: table.size,
});
