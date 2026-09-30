// 파스텔 팔레트(32색 이내). 지역마다 이 안에서 톤을 고른다.
export const PAL = {
  ink: 0x3d3656,
  night: 0x5d5a8c,
  dusk: 0x8583b8,
  shadow: 0x9f97bf,
  stone: 0xc3bbdb,
  mist: 0xe6e1f2,
  white: 0xfffaf3,
  parchment: 0xfdf1d8,
  parchmentDark: 0xecd3a8,
  scrollEdge: 0xb48c62,
  wood: 0xb08866,
  bark: 0x7f5f4d,
  sand: 0xf8e5bb,
  sandDark: 0xe9cc9a,
  skin: 0xffd9bd,
  skinDark: 0xdcaa8a,
  hair: 0x6e5253,
  grass: 0xb4e2a8,
  grassDark: 0x92cf94,
  grassDeep: 0x7cbf98,
  teal: 0x78c4bf,
  sea: 0x92bfea,
  seaLight: 0xcbe5f9,
  sky: 0xdaeefb,
  gold: 0xffd88a,
  amber: 0xffba8c,
  ember: 0xf08f86,
  wine: 0xc890b6,
  rose: 0xffc4d2,
  olive: 0xc9d28e,
  bread: 0xf6ca92,
  crust: 0xdb9d70,
} as const;

export const css = (c: number) => '#' + c.toString(16).padStart(6, '0');

/** 카메라 fadeOut 등 RGB 인자용 */
export const rgb = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
