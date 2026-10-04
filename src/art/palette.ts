// 사복음서 시리즈(누가·마태·마가 편)와 같은 톤의 차분한 파스텔 색표 (사용자 요청 2026-10-04).
// 처음에는 Resurrect 64에서 골랐으나, 밝고 맑은 색을 손으로 다시 짰다. 원색·형광색·검정은 쓰지 않는다.
// 색 이름과 쓰임(어두운 쪽 → 밝은 쪽, 그림자 → 밝은 면)은 그대로라 그림 코드는 바꾸지 않는다.
// 외곽선·글자 그림자는 검정 대신 짙은 청록(ink)이다.
export const PAL = {
  // 어두운 쪽(외곽선·밤): 검정 대신 짙은 청록·푸른 회색
  ink: 0x2f4b55,
  night: 0x46606b,
  plum: 0x5d5468,
  dusk: 0x56677f,
  indigo: 0x6d7c99,
  shadow: 0x7e7c88,
  mauve: 0x8b7b8b,
  stone: 0xa3a0ad,
  steel: 0xbac5c8,
  mist: 0xdde8e4,
  white: 0xfffdf8,
  // 따뜻한 색: 크림·살구·흙빛
  cream: 0xf7e8d6,
  peach: 0xf2d0bc,
  salmon: 0xe8b3a8,
  rose: 0xe2b6c0,
  pink: 0xd89cab,
  berry: 0xb97d8c,
  wine: 0x97707f,
  red: 0xcf8b82,
  brick: 0xb9837a,
  rust: 0xa47e72,
  clay: 0xd1a487,
  tan: 0xe0bd96,
  honey: 0xedd3a2,
  gold: 0xe8cc8e,
  orange: 0xe6b98c,
  flame: 0xe0a689,
  bark: 0x8b7066,
  mud: 0x7c7462,
  khaki: 0xd8cbb2,
  taupe: 0xbaa89f,
  // 초록·청록: 올리브빛 연두와 물빛
  olive: 0xc4c89e,
  moss: 0x9ca487,
  lime: 0xe0e4b4,
  leaf: 0xc2ddb0,
  grass: 0x9fcaab,
  forest: 0x86ae99,
  pine: 0x60847a,
  sage: 0xb8cab2,
  teal: 0x80b3b1,
  aqua: 0xa2d1c8,
  mint: 0xc3e7dc,
  // 파랑·보라: 맑은 연하늘과 옅은 라벤더
  navy: 0x8e9ec7,
  sky: 0xb9d8e9,
  skyLight: 0xd9ecf3,
  foam: 0xe5f3ef,
  purple: 0xb2a3c5,
  lilac: 0xcbbfe6,
  lavender: 0xebd8ec,
  grape: 0x8f7c9d,
} as const;

export const css = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** 카메라 fadeOut 등 RGB 인자용 */
export const rgb = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
