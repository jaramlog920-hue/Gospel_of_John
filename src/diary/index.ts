// 모닥불 일기. 게임 텍스트만 담고, 본문은 참조 키(refs)로만 가리킨다(설계 원칙 2·3).
import type { Emotion } from '../state/types.ts';
import ch01 from './ch01.json';
import ch06 from './ch06.json';

export interface DiaryChapter {
  ch: number;
  title: string;
  refs: string[];
  entries: Record<Emotion, string>;
  variants: Record<string, string>;
}

export const DIARY: Readonly<Record<number, DiaryChapter>> = { 1: ch01, 6: ch06 };

export function diaryText(ch: number, emotion: Emotion, flags: Record<string, boolean> = {}): string {
  const d = DIARY[ch];
  if (!d) throw new Error(`일기 없음: ${ch}장`);
  const extra = Object.entries(flags)
    .filter(([k, on]) => on && d.variants[k])
    .map(([k]) => d.variants[k]);
  return [d.entries[emotion], ...extra].join(' ');
}
