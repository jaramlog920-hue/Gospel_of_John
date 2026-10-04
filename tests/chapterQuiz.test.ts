// 장 퀴즈 검사: 근거 문구가 본문에 그대로 있고, 차례는 본문 순서이며, 보기가 가장 좁은 세로 화면에도 들어간다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTER_QUIZ, quizzesOf, type ChapterQuizItem } from '../src/story/chapterQuiz.ts';
import { PORTRAIT_MIN } from '../src/ui/layout.ts';
import { loadBdfWidths } from './helpers.ts';

const bible = JSON.parse(readFileSync('data/john_krv.json', 'utf8')) as { ch: number; v: number; text: string }[];
const verse = (ref: string) => {
  const [, c, v] = ref.split(':').map(Number);
  return bible.find((x) => x.ch === c && x.v === v)?.text ?? '';
};
const evidence = JSON.parse(readFileSync('tests/chapterQuiz.evidence.json', 'utf8')) as Record<string, string | string[]>;
const chOf = (ref: string) => Number(ref.split(':')[1]);
const vOf = (ref: string) => Number(ref.split(':')[2]);
const ui = loadBdfWidths('node_modules/galmuri/dist/Galmuri9.bdf');
const width = (s: string) => [...s].reduce((n, ch) => n + (ui.get(ch.codePointAt(0)!) ?? 99), 0);
// 선택지 상자: 화면 폭 - 16 안에 글자 + 40px (Dialog.ts choose)
const MAX_OPTION = PORTRAIT_MIN.w - 16 - 40;

describe('장 퀴즈', () => {
  it('1–21장 모두 장마다 세 문제, id가 겹치지 않는다', () => {
    for (let c = 1; c <= 21; c++) expect(quizzesOf(c)).toHaveLength(3);
    expect(new Set(CHAPTER_QUIZ.map((q) => q.id)).size).toBe(CHAPTER_QUIZ.length);
  });

  it('장마다 종류가 섞이고, 전체에 차례 맞추기가 여럿 있다', () => {
    expect(CHAPTER_QUIZ.filter((q) => q.type === 'order').length).toBeGreaterThanOrEqual(10);
  });

  for (const q of CHAPTER_QUIZ as ChapterQuizItem[]) {
    it(`${q.id}: 근거가 그 장 본문에 그대로 있다`, () => {
      if (q.type === 'choice') {
        expect(chOf(q.ref)).toBe(q.ch);
        expect(verse(q.ref)).toContain(evidence[q.id] as string);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        for (const o of q.options) expect(width(o), o).toBeLessThanOrEqual(MAX_OPTION);
      } else {
        expect(q.items).toHaveLength(3);
        q.items.forEach((it, k) => {
          expect(chOf(it.ref)).toBe(q.ch);
          expect(verse(it.ref)).toContain((evidence[q.id] as string[])[k]);
          expect(width(it.label), it.label).toBeLessThanOrEqual(MAX_OPTION);
        });
        const vs = q.items.map((it) => vOf(it.ref));
        expect(vs).toEqual([...vs].sort((a, b) => a - b));
        expect(new Set(vs).size).toBe(3);
      }
    });
  }

  it('정답 자리가 한쪽에 몰리지 않는다', () => {
    const choice = CHAPTER_QUIZ.filter((q) => q.type === 'choice');
    const pos = [0, 1, 2, 3].map((i) => choice.filter((q) => q.answer === i).length);
    expect(Math.max(...pos)).toBeLessThanOrEqual(Math.ceil(choice.length / 3));
  });

  it('문제 글에 본문을 옮겨 적지 않는다(따옴표 인용 없음)', () => {
    for (const q of CHAPTER_QUIZ) expect(q.question).not.toMatch(/["“”]/);
  });
});
