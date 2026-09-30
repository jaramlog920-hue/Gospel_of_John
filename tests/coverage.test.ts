import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Verse } from '../scripts/scripture-lib.ts';
import { Scripture } from '../src/data/Scripture.ts';
import { DIARY } from '../src/diary/index.ts';
import { FLOW, stepRefs } from '../src/story/flow.ts';
import { STORIES } from '../src/story/stories.ts';

const verses = JSON.parse(readFileSync('data/john_krv.json', 'utf8')) as Verse[];

describe('요한복음 전체 수록', () => {
  it('게임 흐름을 따라가면 1:1부터 21:25까지 모든 절이 순서대로 한 번씩 나온다', () => {
    const shown = FLOW.flatMap(stepRefs).flatMap((ref) => Scripture.resolve(ref).map((v) => `${v.ch}:${v.v}`));
    const all = verses.map((v) => `${v.ch}:${v.v}`);
    const dupes = shown.filter((k, i) => shown.indexOf(k) !== i);
    const missing = all.filter((k) => !shown.includes(k));
    expect(dupes, '두 번 나오는 절').toEqual([]);
    expect(missing, '빠진 절').toEqual([]);
    expect(shown).toEqual(all);
  });

  it('흐름에 쓰인 이야기 장면이 모두 있고, 모든 이야기가 흐름에 들어 있다', () => {
    const used = FLOW.flatMap((s) => (s.scene === 'Story' ? [s.id] : []));
    for (const id of used) expect(STORIES[id], id).toBeTruthy();
    expect(new Set(used)).toEqual(new Set(Object.keys(STORIES)));
  });

  it('모닥불 단계마다 그 장의 일기가 있다', () => {
    for (const s of FLOW) if (s.scene === 'Campfire') expect(DIARY[s.ch], `${s.ch}장 일기`).toBeTruthy();
  });

  it('선택지 두 개마다 저장할 이름이 있다', () => {
    for (const st of Object.values(STORIES))
      for (const b of st.beats) if (b.choice) expect(b.choice.flags).toHaveLength(b.choice.options.length);
  });
});

describe('일곱 표적', () => {
  it('일곱 개이고, 본문 참조가 유효하며, 그 장이 게임 흐름에 들어 있다', async () => {
    const { SIGNS } = await import('../src/story/signs.ts');
    expect(SIGNS).toHaveLength(7);
    const chapters = new Set(FLOW.flatMap(stepRefs).map((r) => Scripture.resolve(r)[0].ch));
    for (const s of SIGNS) {
      expect(Scripture.resolve(s.ref)[0].ch).toBe(s.ch);
      expect(chapters.has(s.ch)).toBe(true);
    }
  });
});
