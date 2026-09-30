import { describe, expect, it } from 'vitest';
import { computeView, LANDSCAPE_MIN, PORTRAIT_MIN, scrollLayout } from '../src/ui/layout.ts';

describe('화면 크기', () => {
  const cases: [string, number, number, number, boolean][] = [
    ['PC 1280×720', 1280, 720, 1, false],
    ['PC 1920×1080', 1920, 1080, 1, false],
    ['아이폰 가로', 844, 390, 3, false],
    ['아이폰 세로(2/3)', 390, 557, 3, true],
    ['갤럭시 세로(2/3)', 360, 488, 4, true],
    ['안드로이드 세로 dpr 2.625', 412, 600, 2.625, true],
  ];
  for (const [name, w, h, dpr, portrait] of cases) {
    it(`${name}: 최소 해상도를 지키고, 기기 화소로 정수배이며, 칸 안에 들어간다`, () => {
      const v = computeView(w, h, dpr, portrait);
      const min = portrait ? PORTRAIT_MIN : LANDSCAPE_MIN;
      expect(v.w).toBeGreaterThanOrEqual(min.w);
      expect(v.h).toBeGreaterThanOrEqual(min.h);
      const n = v.zoom * dpr;
      expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-9);
      expect(v.w * v.zoom).toBeLessThanOrEqual(w + 0.5);
      expect(v.h * v.zoom).toBeLessThanOrEqual(h + 0.5);
    });
  }

  it('두루마리는 좁은 화면에서도 한 쪽에 여러 줄이 들어간다', () => {
    expect(scrollLayout(PORTRAIT_MIN.w, PORTRAIT_MIN.h).linesPerPage).toBeGreaterThanOrEqual(8);
    expect(scrollLayout(LANDSCAPE_MIN.w, LANDSCAPE_MIN.h).linesPerPage).toBeGreaterThanOrEqual(8);
  });
});
