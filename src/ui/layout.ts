// 화면 치수. 게임의 논리 해상도는 기기에 맞춰 정해진다.
// 폰의 실제 화소 기준으로 정수배로만 키워서 도트와 글자가 고르게 보이게 한다.
// Phaser 없이도 불러올 수 있게 따로 둔다(테스트에서 사용).

export const FONT_SCRIPTURE = 'Galmuri11';
export const FONT_UI = 'Galmuri9';
export const SIZE_SCRIPTURE = 12;
export const SIZE_UI = 10;

/** 가로 화면에서 보장하는 최소 논리 해상도 */
export const LANDSCAPE_MIN = { w: 320, h: 180 } as const;
/** 세로 화면(게임이 화면 위쪽 2/3를 차지)에서 보장하는 최소 논리 해상도 */
export const PORTRAIT_MIN = { w: 216, h: 280 } as const;

export interface View {
  w: number;
  h: number;
  /** CSS 확대 배율. 기기 화소로는 정수배가 된다. */
  zoom: number;
}

/** 게임 칸(CSS px)과 기기 화소 비율로 논리 해상도와 배율을 정한다. */
export function computeView(cssW: number, cssH: number, dpr: number, portrait: boolean): View {
  const min = portrait ? PORTRAIT_MIN : LANDSCAPE_MIN;
  const devW = Math.floor(cssW * dpr);
  const devH = Math.floor(cssH * dpr);
  const n = Math.max(1, Math.floor(Math.min(devW / min.w, devH / min.h)));
  return { w: Math.max(min.w, Math.floor(devW / n)), h: Math.max(min.h, Math.floor(devH / n)), zoom: n / dpr };
}

/** 두루마리 치수. 화면 크기에 맞춰 늘어나고, 한 쪽에 들어갈 줄 수도 따라 바뀐다. */
export function scrollLayout(w: number, h: number) {
  const width = Math.min(w - 16, 360);
  const height = h - 20;
  const padX = 12;
  const padTop = 24;
  const lineHeight = 15;
  const verseNumWidth = 14;
  return {
    x: Math.floor((w - width) / 2),
    y: 10,
    width,
    height,
    padX,
    padTop,
    lineHeight,
    verseNumWidth,
    linesPerPage: Math.floor((height - padTop - 12) / lineHeight),
    textWidth: width - padX * 2 - verseNumWidth,
  };
}

export function isPortraitView(w: number, h: number) {
  return h > w;
}
