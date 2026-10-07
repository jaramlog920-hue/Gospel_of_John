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

// 배경(하늘·땅·벽·언덕·지붕) 전용 색표 — "푸른 새벽(블루아워)" (사용자 요청 2026-10-08: 사도행전 게임과 겹치지 않게 색감부터 아예 다르게).
// 따뜻한 모래·석회암 크림빛 대신 라벤더·푸른 회색 돌·세이지로 차갑게 두고, 등잔·숯불·새벽빛 같은 따뜻한 빛만 도드라지게 한다.
// 사람 옷·살빛은 PAL 그대로.
export const WORLD = {
  // 하늘
  skyDay: [0xb4c0e2, 0xc6d0ec, 0xdbe1f3],
  skyNoon: [0xccd5ee, 0xdbe1f3, 0xeaeef8],
  skyEvening: [0x8f86b8, 0xb59fca, 0xdcbccb],
  skyNight: [0x343f63, 0x3d4970, 0x4b587f],
  skyDawn: [0x4e5c88, 0xa391c0, 0xeec9b6],
  skyOvercast: [0x868ba1, 0x989db2, 0xadb1c3],
  // 땅
  dust: 0xc9c5d6, // 다진 흙길: 라벤더빛 회색 먼지
  dustSpeck: 0xaca7c0,
  dustHi: 0xdad7e5,
  wild: 0xbcc8c0, // 광야: 세이지빛 마른 땅
  wildSpeck: 0x9fae9f,
  wildGrass: 0x8fa596,
  paving: 0xe2e7f1, // 석회암 포석: 푸른 흰빛
  pavingLine: 0xc2cadb,
  pavingHi: 0xf5f7fb,
  basalt: 0x7a8098, // 현무암: 슬레이트
  basaltLine: 0x636982,
  basaltHi: 0x959bb0,
  floor: 0xb2aec4, // 실내 바닥: 라벤더 회벽 흙
  floorSpeck: 0xc4c0d4,
  floorSpeck2: 0x9a95ad,
  deck: 0x9d93a8, // 배 갑판: 차가운 나무
  deckLine: 0x7f768d,
  sand: 0xdedcd6, // 새벽 바닷가: 은빛 모래
  sandSpeck: 0xc3c0b9,
  // 벽·언덕·지붕
  wall: 0xc0c7da,
  wallTop: 0xdfe4ef,
  wallLine: 0xa3abc2,
  plaster: 0xc6c1d5, // 실내 회벽
  plasterLine: 0xa9a3bd,
  roof: 0xa7a1b8,
  roofLine: 0x8a849d,
  hillSlate: 0x9aa2c2,
  hillSlateRim: 0xc0c7e0,
  hillSage: 0x8aaea6,
  hillSageRim: 0xb1cec6,
  hillDusk: 0x6f7c9e,
  hillDuskRim: 0x8f9cbd,
  pillar: 0xedf0f6,
  pillarShade: 0xc6cbdd,
  reed: 0xa6b8a8,
  water: 0xa9c3e0,
  waterHi: 0xcfdcee,
  waterFoam: 0xe4ecf6,
} as const;
