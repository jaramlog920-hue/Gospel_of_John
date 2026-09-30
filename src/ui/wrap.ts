// 띄어쓰기 위치에서만 줄을 바꾼다. 하이픈·말줄임·글자 단위 끊기는 하지 않는다(설계 원칙 1).
// 그래서 wrapWords(text).join(' ') === text 가 항상 성립한다.

export type Measure = (s: string) => number;

export function wrapWords(text: string, maxWidth: number, measure: Measure): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (line !== '' && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

/** 줄 목록을 페이지로 나눈다. 다 안 들어가면 자르지 않고 다음 페이지로 넘긴다. */
export function paginate<T>(lines: readonly T[], linesPerPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
  return pages.length ? pages : [[]];
}
