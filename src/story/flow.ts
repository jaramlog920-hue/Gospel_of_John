// 게임 전체 흐름. 이 순서대로 요한복음 1:1부터 21:25까지 모든 절을 한 번씩 보여준다.
// tests/coverage.test.ts가 빠진 절·겹친 절이 없는지 확인한다.
import { STORIES } from './stories.ts';

/** 1장 빛 퍼즐: 시작 두루마리 + 단계마다 이어지는 본문(1:1–18) */
export const CH1_REFS = { intro: 'john:1:1-3', levels: ['john:1:4-5', 'john:1:6-9', 'john:1:10-18'] };

/** 6장 오병이어 스테이지(6:1–15) */
export const CH6_REFS = {
  intro: 'john:6:1-4',
  lunch: 'john:6:5-9',
  sit: 'john:6:10-11',
  gather: 'john:6:12',
  end: 'john:6:13-15',
};

export type Step =
  | { scene: 'Ch1' }
  | { scene: 'Ch6' }
  | { scene: 'Story'; id: string }
  | { scene: 'Campfire'; ch: number }
  | { scene: 'End' };

const story = (...ids: string[]): Step[] => ids.map((id) => ({ scene: 'Story', id }));
const fire = (ch: number): Step => ({ scene: 'Campfire', ch });

export const FLOW: Step[] = [
  { scene: 'Ch1' },
  ...story('1b'),
  fire(1),
  ...story('2a'),
  fire(2),
  ...story('2b', '3a', '3b', '4a', '4b'),
  fire(4),
  ...story('5a'),
  fire(5),
  ...story('5b'),
  { scene: 'Ch6' },
  ...story('6b', '6c'),
  fire(6),
  ...story('7a', '7b', '8', '9'),
  fire(9),
  ...story('10a', '10b', '10c', '11a', '11b'),
  fire(11),
  ...story('12a', '12b', '12c', '13', '14', '15', '16', '17', '18a', '18b', '18c', '19a', '19b', '19c', '20a', '20b', '21'),
  fire(21),
  { scene: 'End' },
];

/** 각 단계가 보여주는 본문 참조(순서대로) */
export function stepRefs(step: Step): string[] {
  if (step.scene === 'Ch1') return [CH1_REFS.intro, ...CH1_REFS.levels];
  if (step.scene === 'Ch6') return Object.values(CH6_REFS);
  if (step.scene === 'Story') return STORIES[step.id].beats.map((b) => b.ref);
  return [];
}

/** 그 장의 첫 단계 번호(장 선택·이어하기용) */
export function chapterOfStep(step: Step): number | null {
  if (step.scene === 'Ch1') return 1;
  if (step.scene === 'Ch6') return 6;
  if (step.scene === 'Story') return STORIES[step.id].ch;
  return null;
}
