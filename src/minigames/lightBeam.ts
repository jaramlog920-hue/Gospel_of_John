// 1장 빛 퍼즐 규칙. 격자 위에서 빛줄기를 따라가며 거울에 반사시킨다.
// 기호: '#' 벽, '.' 빈칸, '/' '\' 돌릴 수 있는 거울, 'T' 어둠 속 등잔(빛이 지나가면 켜짐),
//       '>' '<' '^' 'v' 빛이 나오는 곳과 방향.

export type Dir = { dx: number; dy: number };
export type Cell = '#' | '.' | '/' | '\\' | 'T' | '>' | '<' | '^' | 'v';

export interface BeamResult {
  /** 빛이 지나간 칸(시작점 포함) */
  path: { x: number; y: number }[];
  /** 빛이 닿은 등잔 좌표 "x,y" */
  lit: Set<string>;
  solved: boolean;
}

const EMITTER: Record<string, Dir> = {
  '>': { dx: 1, dy: 0 },
  '<': { dx: -1, dy: 0 },
  '^': { dx: 0, dy: -1 },
  v: { dx: 0, dy: 1 },
};

export function parseLevel(rows: readonly string[]): Cell[][] {
  return rows.map((r) => [...r] as Cell[]);
}

export function reflect(cell: '/' | '\\', d: Dir): Dir {
  return cell === '/' ? { dx: -d.dy, dy: -d.dx } : { dx: d.dy, dy: d.dx };
}

export function traceBeam(grid: Cell[][]): BeamResult {
  const targets: string[] = [];
  let start: { x: number; y: number; d: Dir } | undefined;
  grid.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c === 'T') targets.push(`${x},${y}`);
      if (c in EMITTER) start = { x, y, d: EMITTER[c] };
    }),
  );
  if (!start) throw new Error('빛이 나오는 곳이 없음');

  const path = [{ x: start.x, y: start.y }];
  const lit = new Set<string>();
  let { x, y, d } = start;
  const limit = grid.length * (grid[0]?.length ?? 0) * 4;
  for (let step = 0; step < limit; step++) {
    x += d.dx;
    y += d.dy;
    const c = grid[y]?.[x];
    if (c === undefined || c === '#' || c in EMITTER) break;
    path.push({ x, y });
    if (c === 'T') lit.add(`${x},${y}`);
    if (c === '/' || c === '\\') d = reflect(c, d);
  }
  return { path, lit, solved: targets.length > 0 && targets.every((t) => lit.has(t)) };
}

export function toggleMirror(grid: Cell[][], x: number, y: number): boolean {
  const c = grid[y]?.[x];
  if (c !== '/' && c !== '\\') return false;
  grid[y][x] = c === '/' ? '\\' : '/';
  return true;
}

/** 시작 상태는 모두 풀리지 않은 상태여야 한다(테스트로 확인). */
export const LEVELS: readonly (readonly string[])[] = [
  [
    '############',
    '#>..../....#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#.....T....#',
    '############',
  ],
  [
    '############',
    '#v.........#',
    '#........T.#',
    '#..........#',
    '#..........#',
    '#/..T....\\.#',
    '############',
  ],
  [
    '############',
    '#..\\......<#',
    '#..T..\\....#',
    '#....#.....#',
    '#../....T..#',
    '#..........#',
    '############',
  ],
];
