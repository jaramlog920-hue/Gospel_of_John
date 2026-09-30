import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkStructure, serialize, sha256, VERSES_PER_CHAPTER, type Verse } from '../scripts/scripture-lib.ts';
import { Scripture } from '../src/data/Scripture.ts';
import { SCROLL_TEXT_WIDTH } from '../src/ui/layout.ts';
import { wrapWords } from '../src/ui/wrap.ts';
import { listFiles, loadBdfWidths } from './helpers.ts';

const content = readFileSync('data/john_krv.json', 'utf8');
const verses = JSON.parse(content) as Verse[];

describe('본문 파일', () => {
  it('해시가 john_krv.sha256과 일치한다', () => {
    const expected = readFileSync('data/john_krv.sha256', 'utf8').split(/\s+/)[0];
    expect(sha256(content)).toBe(expected);
  });

  it('879절이고 장별 절 수가 맞다', () => {
    expect(verses).toHaveLength(879);
    expect(checkStructure(verses)).toEqual([]);
    VERSES_PER_CHAPTER.forEach((n, i) => expect(verses.filter((x) => x.ch === i + 1)).toHaveLength(n));
  });

  it('표준 직렬화 형식이다', () => {
    expect(serialize(verses)).toBe(content);
  });
});

describe('Scripture 로더', () => {
  it('원문 그대로 돌려주고 수정할 수 없다', () => {
    const v = Scripture.get(6, 11);
    expect(v.text).toBe(verses.find((x) => x.ch === 6 && x.v === 11)!.text);
    expect(Object.isFrozen(v)).toBe(true);
    expect(Object.isFrozen(Scripture)).toBe(true);
    expect(Scripture.count).toBe(879);
  });

  it('범위 참조와 표기', () => {
    expect(Scripture.resolve('john:6:10-13').map((x) => x.v)).toEqual([10, 11, 12, 13]);
    expect(Scripture.label('john:6:11')).toBe('요 6:11');
    expect(Scripture.label('john:1:1-5')).toBe('요 1:1–5');
    expect(() => Scripture.get(21, 26)).toThrow();
  });
});

describe('폰트', () => {
  const fonts = ['Galmuri11', 'Galmuri9'].map((f) => [f, loadBdfWidths(`node_modules/galmuri/dist/${f}.bdf`)] as const);

  it('본문의 모든 글자가 두 폰트에 들어 있다', () => {
    const chars = new Set([...verses.map((x) => x.text).join('')]);
    for (const [name, widths] of fonts) {
      const missing = [...chars].filter((c) => !widths.has(c.codePointAt(0)!));
      expect(missing, name).toEqual([]);
    }
  });

  it('게임 코드와 데이터의 모든 글자가 두 폰트에 들어 있다', () => {
    const chars = new Set<string>();
    for (const f of listFiles('src', ['.ts', '.json'])) for (const c of readFileSync(f, 'utf8')) if (c > '~') chars.add(c);
    // 화면에 쓰지 않는 기호(주석의 화살표 등)는 제외
    for (const c of '→–—·✓⚠️') chars.delete(c);
    for (const [name, widths] of fonts) {
      const missing = [...chars].filter((c) => !widths.has(c.codePointAt(0)!));
      expect(missing, name).toEqual([]);
    }
  });
});

describe('두루마리 줄바꿈', () => {
  const widths = loadBdfWidths('node_modules/galmuri/dist/Galmuri11.bdf');
  const measure = (s: string) => [...s].reduce((w, c) => w + (widths.get(c.codePointAt(0)!) ?? 12), 0);

  it('모든 절이 띄어쓰기에서만 끊기고, 다시 이으면 원문과 같다', () => {
    for (const x of verses) {
      const lines = wrapWords(x.text, SCROLL_TEXT_WIDTH, measure);
      expect(lines.join(' '), `${x.ch}:${x.v}`).toBe(x.text);
      for (const line of lines) expect(measure(line), `${x.ch}:${x.v} "${line}"`).toBeLessThanOrEqual(SCROLL_TEXT_WIDTH);
    }
  });
});

describe('본문 하드코딩 금지', () => {
  // 본문 12글자 이상이 그대로 코드·데이터에 들어 있으면 실패한다. 본문은 참조 키로만 가리킨다.
  const WINDOW = 12;
  const windows = new Set<string>();
  for (const x of verses) for (let i = 0; i + WINDOW <= x.text.length; i++) windows.add(x.text.slice(i, i + WINDOW));

  it('src/ 안에 본문 문자열이 없다', () => {
    for (const f of listFiles('src', ['.ts', '.json'])) {
      const src = readFileSync(f, 'utf8');
      for (let i = 0; i + WINDOW <= src.length; i++) {
        const w = src.slice(i, i + WINDOW);
        if (windows.has(w)) throw new Error(`${f}에 본문 문자열이 있음: "${w}"`);
      }
    }
  });
});
