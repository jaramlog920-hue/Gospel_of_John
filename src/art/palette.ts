// Resurrect 64 팔레트(Kerrie Lake, lospec.com/palette-list/resurrect-64)에서 고른 색.
// 요즘 인디 도트 게임에서 가장 많이 쓰는 팔레트 가운데 하나로, 색마다 명암 단계가 잘 이어진다.
export const PAL = {
  // 어두운 쪽(외곽선·밤)
  ink: 0x2e222f,
  night: 0x3e3546,
  plum: 0x45293f,
  dusk: 0x323353,
  indigo: 0x484a77,
  shadow: 0x625565,
  mauve: 0x694f62,
  stone: 0x7f708a,
  steel: 0x9babb2,
  mist: 0xc7dcd0,
  white: 0xffffff,
  // 따뜻한 색
  cream: 0xfdcbb0,
  peach: 0xfca790,
  salmon: 0xf68181,
  rose: 0xed8099,
  pink: 0xf04f78,
  berry: 0xc32454,
  wine: 0x831c5d,
  red: 0xe83b3b,
  brick: 0xb33831,
  rust: 0x9e4539,
  clay: 0xcd683d,
  tan: 0xe6904e,
  honey: 0xfbb954,
  gold: 0xf9c22b,
  orange: 0xf79617,
  flame: 0xfb6b1d,
  bark: 0x6e2727,
  mud: 0x4c3e24,
  khaki: 0xab947a,
  taupe: 0x966c6c,
  // 초록·청록
  olive: 0xa2a947,
  moss: 0x676633,
  lime: 0xd5e04b,
  leaf: 0x91db69,
  grass: 0x1ebc73,
  forest: 0x239063,
  pine: 0x165a4c,
  sage: 0x92a984,
  teal: 0x0b8a8f,
  aqua: 0x0eaf9b,
  mint: 0x30e1b9,
  // 파랑·보라
  navy: 0x4d65b4,
  sky: 0x4d9be6,
  skyLight: 0x8fd3ff,
  foam: 0x8ff8e2,
  purple: 0x905ea9,
  lilac: 0xa884f3,
  lavender: 0xeaaded,
  grape: 0x6b3e75,
} as const;

export const css = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** 카메라 fadeOut 등 RGB 인자용 */
export const rgb = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
