import { describe, expect, it } from 'vitest';
import { LEVELS, parseLevel, reflect, toggleMirror, traceBeam } from '../src/minigames/lightBeam.ts';

describe('빛 퍼즐', () => {
  it('거울 반사', () => {
    expect(reflect('/', { dx: 1, dy: 0 })).toEqual({ dx: -0, dy: -1 });
    expect(reflect('\\', { dx: 1, dy: 0 })).toEqual({ dx: 0, dy: 1 });
  });

  LEVELS.forEach((rows, i) => {
    it(`${i + 1}단계는 처음엔 풀려 있지 않고, 거울을 돌려 풀 수 있다`, () => {
      expect(traceBeam(parseLevel(rows)).solved).toBe(false);
      const mirrors: [number, number][] = [];
      parseLevel(rows).forEach((r, y) => r.forEach((c, x) => (c === '/' || c === '\\') && mirrors.push([x, y])));
      let solvable = false;
      for (let mask = 0; mask < 1 << mirrors.length && !solvable; mask++) {
        const grid = parseLevel(rows);
        mirrors.forEach(([x, y], k) => mask & (1 << k) && toggleMirror(grid, x, y));
        solvable = traceBeam(grid).solved;
      }
      expect(solvable).toBe(true);
    });
  });
});
