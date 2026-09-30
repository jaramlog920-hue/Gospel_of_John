// 일곱 표적. 이름은 게임 텍스트이고, 본문은 참조 키로만 가리킨다.
export interface Sign {
  n: number;
  name: string;
  ch: number;
  ref: string;
}

export const SIGNS: readonly Sign[] = [
  { n: 1, name: '물이 포도주로', ch: 2, ref: 'john:2:1-11' },
  { n: 2, name: '왕의 신하의 아들이 나음', ch: 4, ref: 'john:4:46-54' },
  { n: 3, name: '38년 된 병자가 일어남', ch: 5, ref: 'john:5:1-9' },
  { n: 4, name: '오천 명을 먹이심', ch: 6, ref: 'john:6:1-14' },
  { n: 5, name: '바다 위로 걸으심', ch: 6, ref: 'john:6:16-21' },
  { n: 6, name: '날 때부터 못 보던 사람이 봄', ch: 9, ref: 'john:9:1-7' },
  { n: 7, name: '나사로가 살아남', ch: 11, ref: 'john:11:38-44' },
];
