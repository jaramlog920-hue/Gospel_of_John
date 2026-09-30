// 화면·두루마리 치수. Phaser 없이도 불러올 수 있게 따로 둔다(테스트에서 사용).
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;

export const FONT_SCRIPTURE = 'Galmuri11';
export const FONT_UI = 'Galmuri9';
export const SIZE_SCRIPTURE = 12;
export const SIZE_UI = 10;

export const SCROLL = {
  x: 14,
  y: 10,
  width: 292,
  height: 160,
  padX: 14,
  padTop: 22,
  lineHeight: 15,
  linesPerPage: 8,
  verseNumWidth: 14,
} as const;

/** 본문 한 줄이 쓸 수 있는 폭 */
export const SCROLL_TEXT_WIDTH = SCROLL.width - SCROLL.padX * 2 - SCROLL.verseNumWidth;
