// 장 퀴즈(사용자 요청 2026-10-04: 장이 끝날 때마다 여러 가지로).
// 장의 마지막 절이 나오는 단계를 마치면 그 장의 다섯 문제를 푼다(처음 세 문제에서 2026-10-04 늘림). 종류는 고르기와 차례 맞추기.
// 본문은 참조 키로만 두고, 맞히면 근거 절을 두루마리로 연다(설계 원칙 1·2).
// 틀린 본문이 화면에 나오는 문제(빈칸 보기, 낱말 섞기)는 만들지 않는다(설계 원칙 4).
// 틀려도 벌칙 없이 다시 고른다. 점수는 없다(설계 원칙 6·7). 검사: tests/chapterQuiz.test.ts
import raw from './chapterQuiz.json';
import bible from '../../data/john_krv.json';
import { Scripture } from '../data/Scripture.ts';
import { FLOW, stepRefs } from './flow.ts';

export interface ChoiceQuiz {
  id: string;
  ch: number;
  type: 'choice';
  title: string;
  question: string;
  options: string[];
  answer: number;
  /** 근거 절(맞히면 두루마리로 연다). 근거 문구는 tests/chapterQuiz.evidence.json에 둔다(src에 본문을 두지 않는다) */
  ref: string;
}
export interface OrderQuiz {
  id: string;
  ch: number;
  type: 'order';
  title: string;
  question: string;
  /** 본문 차례대로 */
  items: { label: string; ref: string }[];
}
export type ChapterQuizItem = ChoiceQuiz | OrderQuiz;

export const CHAPTER_QUIZ = raw as ChapterQuizItem[];

export function quizzesOf(ch: number): ChapterQuizItem[] {
  return CHAPTER_QUIZ.filter((q) => q.ch === ch);
}

const lastVerse = new Map<number, number>();
for (const x of bible as { ch: number; v: number }[]) lastVerse.set(x.ch, Math.max(lastVerse.get(x.ch) ?? 0, x.v));

/** 이 단계에서 끝나는 장(그 장의 마지막 절이 이 단계에 나온다) */
export function chaptersEndingAt(stepIndex: number): number[] {
  const step = FLOW[stepIndex];
  if (!step) return [];
  const out: number[] = [];
  for (const ref of stepRefs(step))
    for (const e of Scripture.resolve(ref)) if (e.v === lastVerse.get(e.ch) && quizzesOf(e.ch).length && !out.includes(e.ch)) out.push(e.ch);
  return out;
}

export const quizFlag = (ch: number) => `quiz:${ch}`;
