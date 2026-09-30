// 저장 데이터에는 진행도만 넣고 본문은 넣지 않는다. localStorage 3슬롯.
import type { Emotion } from './types.ts';

export interface DiaryRecord {
  ch: number;
  emotion: Emotion;
  flags: Record<string, boolean>;
}

export interface SaveData {
  version: 1;
  chaptersDone: number[];
  diary: DiaryRecord[];
  /** 모은 절 참조 키(john:6:11). 말씀 도감용 */
  verses: string[];
  flags: Record<string, boolean>;
  updatedAt: number;
}

const KEY = (slot: number) => `seven-signs:save:${slot}`;

export function emptySave(): SaveData {
  return { version: 1, chaptersDone: [], diary: [], verses: [], flags: {}, updatedAt: 0 };
}

let current: SaveData = emptySave();
let currentSlot = 1;

export const Save = {
  get data(): SaveData {
    return current;
  },
  load(slot = 1): SaveData | null {
    currentSlot = slot;
    try {
      const raw = localStorage.getItem(KEY(slot));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== 1) return null;
      current = { ...emptySave(), ...parsed };
      return current;
    } catch {
      return null;
    }
  },
  startNew(slot = 1): void {
    currentSlot = slot;
    current = emptySave();
    this.write();
  },
  write(): void {
    current.updatedAt = Date.now();
    try {
      localStorage.setItem(KEY(currentSlot), JSON.stringify(current));
    } catch {
      // 비공개 창 등에서 저장이 막혀도 게임은 계속한다.
    }
  },
  addVerses(refs: string[]): void {
    for (const r of refs) if (!current.verses.includes(r)) current.verses.push(r);
    this.write();
  },
  setFlag(name: string, value: boolean): void {
    current.flags[name] = value;
    this.write();
  },
  recordDiary(rec: DiaryRecord): void {
    current.diary = current.diary.filter((d) => d.ch !== rec.ch).concat(rec);
    if (!current.chaptersDone.includes(rec.ch)) current.chaptersDone.push(rec.ch);
    this.write();
  },
};
