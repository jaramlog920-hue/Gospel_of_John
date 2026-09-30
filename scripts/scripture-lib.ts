// 본문 파일 형식과 검증 규칙. import/verify 스크립트와 테스트가 함께 쓴다.
import { createHash } from 'node:crypto';

export interface Verse {
  ch: number;
  v: number;
  text: string;
}

// 요한복음 장별 절 수 (합계 879)
export const VERSES_PER_CHAPTER = [
  51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25,
] as const;

export const TOTAL_VERSES = 879;

/** 한 줄에 한 절씩 쓰는 고정 직렬화. 해시는 이 바이트열에 대해 계산한다. */
export function serialize(verses: readonly Verse[]): string {
  const lines = verses.map((x) => '  ' + JSON.stringify({ ch: x.ch, v: x.v, text: x.text }));
  return '[\n' + lines.join(',\n') + '\n]\n';
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** 구조 검증. 문제가 없으면 빈 배열을 돌려준다. */
export function checkStructure(verses: readonly Verse[]): string[] {
  const errors: string[] = [];
  if (verses.length !== TOTAL_VERSES) errors.push(`절 수 ${verses.length} (기대값 ${TOTAL_VERSES})`);
  let i = 0;
  VERSES_PER_CHAPTER.forEach((count, idx) => {
    for (let v = 1; v <= count; v++, i++) {
      const x = verses[i];
      if (!x || x.ch !== idx + 1 || x.v !== v) {
        errors.push(`순서 오류: ${idx + 1}:${v} 자리에 ${x ? `${x.ch}:${x.v}` : '없음'}`);
        return;
      }
      // 줄바꿈은 띄어쓰기에서만 하므로, 공백이 정확히 한 칸씩이어야 다시 이어 붙였을 때 원문과 같다.
      if (x.text !== x.text.trim() || x.text.includes('  ') || /[\t\r\n]/.test(x.text) || x.text === '') {
        errors.push(`${x.ch}:${x.v} 공백 형식 오류`);
      }
    }
  });
  return errors;
}
