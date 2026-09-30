import { describe, expect, it } from 'vitest';
import { Scripture } from '../src/data/Scripture.ts';
import { DIARY, diaryText } from '../src/diary/index.ts';
import { EMOTIONS } from '../src/state/types.ts';
import { wrapWords } from '../src/ui/wrap.ts';

describe('모닥불 일기', () => {
  it('모든 장에 다섯 감정 일기가 있고, 참조 키가 유효하다', () => {
    for (const d of Object.values(DIARY)) {
      for (const e of EMOTIONS) expect(d.entries[e.key], `${d.ch}장 ${e.key}`).toBeTruthy();
      for (const r of d.refs) expect(Scripture.resolve(r).length).toBeGreaterThan(0);
    }
  });

  it('선택 플래그에 따라 문장이 덧붙는다', () => {
    expect(diaryText(6, 'wonder', { sharedFigs: true })).toContain('무화과를 나눠 준');
    expect(diaryText(6, 'wonder', { keptFigs: true })).toContain('무화과 세 개가');
  });

  it('줄바꿈 함수는 빈 문자열과 긴 어절도 안전하게 다룬다', () => {
    const m = (s: string) => s.length * 10;
    expect(wrapWords('', 50, m)).toEqual(['']);
    expect(wrapWords('가나다라마바사아자차', 50, m)).toEqual(['가나다라마바사아자차']);
    expect(wrapWords('가나 다라 마바', 50, m)).toEqual(['가나 다라', '마바']);
  });
});
