// 도트 그림을 코드로 그려 텍스처로 등록한다(이미지 파일 0바이트).
// 그림체: Resurrect 64 팔레트, 1px 외곽선, 두세 단계 명암. 캐릭터는 앞·뒤·옆 걷기 모습이 있다.
import Phaser from 'phaser';
import { PAL, css } from './palette.ts';

// ───────── 픽셀 버퍼 ─────────

class Pix {
  readonly data: Int32Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Int32Array(w * h).fill(-1);
  }
  set(x: number, y: number, c: number) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
  }
  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.data[y * this.w + x] : -1;
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** 문자 지도. '.'은 건너뛴다. */
  map(ox: number, oy: number, rows: string[], colors: Record<string, number>) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && colors[ch] !== undefined && this.set(ox + x, oy + y, colors[ch])));
  }
  /** 비어 있는 칸 가운데 그림과 맞닿은 곳에 외곽선을 두른다. */
  outline(color: number = PAL.ink) {
    const copy = this.data.slice();
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? copy[y * this.w + x] : -1);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (at(x, y) === -1 && (at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0)) this.set(x, y, color);
    return this;
  }
  draw(ctx: CanvasRenderingContext2D, ox = 0, oy = 0) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.data[y * this.w + x];
        if (c < 0) continue;
        ctx.fillStyle = css(c);
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
  }
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
  return tex;
}

function pixTexture(scene: Phaser.Scene, key: string, p: Pix) {
  return canvasTexture(scene, key, p.w, p.h, (ctx) => p.draw(ctx));
}

/** 지도 한 장을 외곽선과 함께 텍스처로 */
function mapTexture(scene: Phaser.Scene, key: string, rows: string[], colors: Record<string, number>, outline = true) {
  const p = new Pix(rows[0].length + 2, rows.length + 2);
  p.map(1, 1, rows, colors);
  if (outline) p.outline();
  return pixTexture(scene, key, p);
}

// ───────── 사람 ─────────

export interface PersonStyle {
  robe: number;
  robeShade: number;
  sash: number;
  hair: number;
  hairShade?: number;
  skin?: number;
  skinShade?: number;
  headcloth?: number;
  headclothShade?: number;
  kid?: boolean;
}

export type Facing = 'down' | 'up' | 'side';
const FACINGS: Facing[] = ['down', 'up', 'side'];
const FRAME_W = 16;
const FRAME_H = 24;

/** 16×24 한 프레임. frame 0·2 서기, 1·3 걷기. side는 오른쪽을 본다. */
function drawPerson(p: Pix, ox: number, dir: Facing, frame: number, s: PersonStyle) {
  const skin = s.skin ?? PAL.cream;
  const skinShade = s.skinShade ?? PAL.peach;
  const hair = s.hair;
  const hairShade = s.hairShade ?? PAL.ink;
  const step = frame === 1 || frame === 3;
  const t = (s.kid ? 4 : 1) + (step ? 1 : 0); // 머리 위쪽. 걸을 때 한 칸 내려앉는다.
  const b0 = t + 9; // 몸통 시작
  const feet = 21;
  const set = (x: number, y: number, c: number) => p.set(ox + x, y, c);
  const rect = (x: number, y: number, w: number, h: number, c: number) => p.rect(ox + x, y, w, h, c);
  const cloth = s.headcloth;
  const clothShade = s.headclothShade ?? s.robeShade;

  if (dir === 'side') {
    // 머리(오른쪽을 봄)
    rect(6, t + 1, 5, 1, hair);
    rect(5, t + 2, 7, 2, hair);
    rect(8, t + 4, 4, 4, skin);
    rect(5, t + 4, 3, 4, hair);
    rect(7, t + 8, 4, 1, skin);
    set(12, t + 6, skin); // 코
    rect(10, t + 5, 1, 2, PAL.ink); // 눈
    set(9, t + 7, PAL.salmon);
    set(8, t + 7, skinShade);
    rect(5, t + 4, 1, 3, hairShade);
    if (cloth !== undefined) {
      rect(5, t, 7, 3, cloth);
      rect(4, t + 3, 4, 6, cloth);
      rect(4, t + 3, 1, 6, clothShade);
      rect(5, t + 2, 7, 1, s.sash);
    }
    // 몸통
    for (let y = b0; y < feet; y++) {
      const wide = y >= b0 + 5;
      rect(wide ? 5 : 6, y, wide ? 7 : 5, 1, s.robe);
      set(wide ? 5 : 6, y, s.robeShade);
    }
    rect(6, b0 + 4, 5, 1, s.sash);
    // 앞팔: 걸을 때 앞뒤로 흔든다.
    const hand = frame === 1 ? 10 : frame === 3 ? 7 : 9;
    rect(8, b0 + 1, 2, 3, s.robeShade);
    set(hand, b0 + 4, s.robeShade);
    set(hand, b0 + 5, skin);
    // 발
    if (frame === 1) {
      rect(10, feet, 2, 1, PAL.mud);
      rect(5, feet, 2, 1, PAL.mud);
    } else if (frame === 3) {
      rect(9, feet, 2, 1, PAL.mud);
      rect(6, feet, 2, 1, PAL.mud);
    } else rect(7, feet, 3, 1, PAL.mud);
    return;
  }

  // 머리(앞·뒤)
  rect(5, t + 1, 6, 1, hair);
  rect(4, t + 2, 8, 2, hair);
  if (dir === 'down') {
    rect(5, t + 3, 6, 1, hair);
    rect(5, t + 4, 6, 4, skin);
    rect(6, t + 8, 4, 1, skin);
    rect(4, t + 4, 1, 3, hair);
    rect(11, t + 4, 1, 3, hair);
    rect(10, t + 4, 1, 4, skinShade);
    rect(6, t + 5, 1, 2, PAL.ink);
    rect(9, t + 5, 1, 2, PAL.ink);
    set(5, t + 7, PAL.salmon);
    set(10, t + 7, PAL.salmon);
    set(6, t + 2, PAL.white); // 머리 윤기
  } else {
    rect(4, t + 3, 8, 5, hair);
    rect(5, t + 8, 6, 1, hair);
    rect(10, t + 2, 2, 6, hairShade);
    set(8, t + 8, skin);
  }
  if (cloth !== undefined) {
    rect(4, t, 8, 3, cloth);
    rect(3, t + 3, 2, 6, cloth);
    rect(11, t + 3, 2, 6, clothShade);
    rect(4, t + 2, 8, 1, s.sash);
    if (dir === 'up') rect(4, t + 3, 8, 6, cloth), rect(9, t + 3, 3, 6, clothShade);
  }
  // 몸통
  for (let y = b0; y < feet; y++) {
    const wide = y >= b0 + 5;
    rect(wide ? 4 : 5, y, wide ? 8 : 6, 1, s.robe);
    rect(wide ? 10 : 9, y, 2, 1, s.robeShade);
  }
  rect(5, b0 + 4, 6, 1, s.sash);
  if (dir === 'down') rect(7, b0, 2, 1, skinShade); // 목
  // 팔
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  rect(3, b0 + 1 + swing, 1, 4, s.robe);
  rect(12, b0 + 1 - swing, 1, 4, s.robeShade);
  set(3, b0 + 5 + swing, skin);
  set(12, b0 + 5 - swing, skinShade);
  // 발
  const lf = frame === 1 ? 1 : 0;
  const rf = frame === 3 ? 1 : 0;
  rect(5, feet - lf, 2, 1 + lf, PAL.mud);
  rect(9, feet - rf, 2, 1 + rf, PAL.mud);
}

/** 앞(0–3)·뒤(4–7)·옆(8–11) 걷기 프레임을 한 장에 그린다. */
export function makePerson(scene: Phaser.Scene, key: string, style: PersonStyle) {
  const frames = FACINGS.length * 4;
  const tex = canvasTexture(scene, key, FRAME_W * frames, FRAME_H, (ctx) => {
    FACINGS.forEach((dir, d) => {
      for (let f = 0; f < 4; f++) {
        const p = new Pix(FRAME_W, FRAME_H);
        drawPerson(p, 0, dir, f, style);
        p.outline();
        p.draw(ctx, (d * 4 + f) * FRAME_W, 0);
      }
    });
  });
  for (let i = 0; i < frames; i++) tex.add(i, 0, i * FRAME_W, 0, FRAME_W, FRAME_H);
  FACINGS.forEach((dir, d) =>
    scene.anims.create({
      key: `${key}-walk-${dir}`,
      frames: scene.anims.generateFrameNumbers(key, { frames: [0, 1, 2, 3].map((f) => d * 4 + f) }),
      frameRate: 8,
      repeat: -1,
    }),
  );
}

/** 움직이는 방향에 맞춰 걷기 모습을 고른다. 멈추면 그 방향으로 선다. */
export function faceAndWalk(sprite: Phaser.GameObjects.Sprite, key: string, vx: number, vy: number) {
  if (vx === 0 && vy === 0) {
    if (sprite.anims.isPlaying) {
      const dir = (sprite.getData('facing') as Facing) ?? 'down';
      sprite.anims.stop();
      sprite.setFrame(FACINGS.indexOf(dir) * 4);
    }
    return;
  }
  const dir: Facing = Math.abs(vx) >= Math.abs(vy) ? 'side' : vy < 0 ? 'up' : 'down';
  if (dir === 'side') sprite.setFlipX(vx < 0);
  else sprite.setFlipX(false);
  sprite.setData('facing', dir);
  const anim = `${key}-walk-${dir}`;
  if (sprite.anims.currentAnim?.key !== anim || !sprite.anims.isPlaying) sprite.play(anim, true);
}

/** 서 있는 모습으로 방향만 바꾼다. */
export function faceTo(sprite: Phaser.GameObjects.Sprite, dir: Facing, left = false) {
  sprite.anims.stop();
  sprite.setData('facing', dir);
  sprite.setFlipX(dir === 'side' && left);
  sprite.setFrame(FACINGS.indexOf(dir) * 4);
}

/** 16×16 앉은 사람(무리) */
function makeSitter(scene: Phaser.Scene, key: string, robe: number, robeShade: number, head: number, headShade: number) {
  const p = new Pix(16, 16);
  p.rect(5, 1, 6, 2, head);
  p.rect(4, 2, 8, 1, head);
  p.rect(5, 3, 6, 4, PAL.cream);
  p.rect(4, 3, 1, 4, head);
  p.rect(11, 3, 1, 4, headShade);
  p.rect(10, 3, 1, 4, PAL.peach);
  p.set(6, 4, PAL.ink);
  p.set(9, 4, PAL.ink);
  p.set(5, 5, PAL.salmon);
  p.rect(4, 7, 8, 4, robe);
  p.rect(2, 10, 12, 3, robe);
  p.rect(10, 7, 2, 4, robeShade);
  p.rect(11, 10, 3, 3, robeShade);
  p.rect(6, 10, 4, 1, robeShade);
  p.outline();
  pixTexture(scene, key, p);
}

const ROBE_SET: [number, number][] = [
  [PAL.berry, PAL.wine],
  [PAL.olive, PAL.moss],
  [PAL.navy, PAL.indigo],
  [PAL.tan, PAL.clay],
  [PAL.purple, PAL.grape],
  [PAL.aqua, PAL.teal],
  [PAL.khaki, PAL.taupe],
  [PAL.salmon, PAL.brick],
];
const HEAD_SET: [number, number][] = [
  [PAL.mist, PAL.steel],
  [PAL.cream, PAL.peach],
  [PAL.honey, PAL.tan],
  [PAL.lavender, PAL.lilac],
  [PAL.white, PAL.mist],
];

export function generateTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('player')) return;

  makePerson(scene, 'player', { robe: PAL.aqua, robeShade: PAL.teal, sash: PAL.gold, hair: PAL.mud, hairShade: PAL.ink, kid: true });
  makePerson(scene, 'kid-cry', { robe: PAL.rose, robeShade: PAL.berry, sash: PAL.white, hair: PAL.rust, hairShade: PAL.bark, kid: true });
  makePerson(scene, 'kid-lunch', { robe: PAL.honey, robeShade: PAL.tan, sash: PAL.clay, hair: PAL.mud, kid: true });
  makePerson(scene, 'light-figure', { robe: PAL.white, robeShade: PAL.mist, sash: PAL.gold, hair: PAL.mud, skin: PAL.cream });
  for (let i = 0; i < 6; i++) {
    const [robe, robeShade] = ROBE_SET[i];
    const [cloth, clothShade] = HEAD_SET[i % HEAD_SET.length];
    makePerson(scene, `crowd${i}`, {
      robe,
      robeShade,
      sash: ROBE_SET[(i + 3) % ROBE_SET.length][0],
      hair: PAL.mud,
      headcloth: cloth,
      headclothShade: clothShade,
      skin: i % 2 ? PAL.tan : PAL.cream,
      skinShade: i % 2 ? PAL.clay : PAL.peach,
    });
  }
  ROBE_SET.forEach(([r, rs], i) => makeSitter(scene, `sitter${i}`, r, rs, ...HEAD_SET[i % HEAD_SET.length]));

  // ───────── 음식과 바구니 ─────────
  mapTexture(scene, 'bread', ['..hhhhhh..', '.hHHHHHHh.', 'hHHhHHhHHc', 'hHHHHHHHHc', '.cccccccc.'], {
    h: PAL.honey,
    H: PAL.gold,
    c: PAL.clay,
  });
  mapTexture(scene, 'fish', ['..sssss..s.', '.sMMMMMs.ss', 'sMeMMMMMss.', 'sSSSSSSSss.', '.sSSSSSs.ss', '..sssss..s.'], {
    s: PAL.steel,
    M: PAL.mist,
    S: PAL.steel,
    e: PAL.ink,
  });
  mapTexture(scene, 'crumb', ['hh', 'hc'], { h: PAL.honey, c: PAL.clay });
  mapTexture(scene, 'fig', ['..g..', '.ww..', 'wwWw.', 'wWwww', 'wwwwp', '.www.'], {
    g: PAL.forest,
    w: PAL.purple,
    W: PAL.lilac,
    p: PAL.grape,
  });
  const basketRows = ['WWWWWWWWWWWW', 'WdWdWdWdWdWd', 'WWWWWWWWWWWW', '.WdWdWdWdWd.', '.WWWWWWWWWW.', '..dddddddd..'];
  mapTexture(scene, 'basket', basketRows, { W: PAL.khaki, d: PAL.taupe });
  mapTexture(scene, 'basket-full', ['.hHhHhhHhc..', 'hHhHhHhHhHc.', ...basketRows], {
    h: PAL.honey,
    H: PAL.gold,
    c: PAL.clay,
    W: PAL.khaki,
    d: PAL.taupe,
  });
  mapTexture(scene, 'heart', ['rr.rr', 'rWrrr', 'rrrrr', '.rrr.', '..r..'], { r: PAL.pink, W: PAL.white });

  // 말풍선
  mapTexture(
    scene,
    'bubble',
    ['.WWWWWWWWWWWW.', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', '.WWWWWWWWWWWW.', '.....WWW......', '......W.......'],
    { W: PAL.white },
  );

  // ───────── 땅 ─────────
  const grassBase = (p: Pix) => {
    p.rect(0, 0, 16, 16, PAL.forest);
  };
  const tile = (key: string, extra?: (p: Pix) => void) => {
    const p = new Pix(16, 16);
    grassBase(p);
    extra?.(p);
    pixTexture(scene, key, p);
  };
  tile('grass');
  tile('grass-tuft', (p) => p.map(5, 8, ['g...g', '.g.g.', 'pgpgp'], { g: PAL.grass, p: PAL.pine }));
  tile('grass-flower', (p) => p.map(6, 5, ['.p.', 'pWp', '.p.', '.f.', 'fLf'], { p: PAL.pink, W: PAL.honey, f: PAL.pine, L: PAL.grass }));
  tile('grass-flower2', (p) => p.map(4, 7, ['.l.', 'lWl', '.l.', '..f', '...'], { l: PAL.lavender, W: PAL.white, f: PAL.pine }));
  canvasTexture(scene, 'sand', 16, 16, (ctx) => {
    const p = new Pix(16, 16);
    p.rect(0, 0, 16, 16, PAL.honey);
    for (const [x, y] of [
      [3, 2],
      [10, 5],
      [6, 11],
      [13, 13],
    ])
      p.set(x, y, PAL.tan);
    p.draw(ctx);
  });
  canvasTexture(scene, 'water', 32, 16, (ctx) => {
    const p = new Pix(32, 16);
    p.rect(0, 0, 32, 16, PAL.sky);
    p.map(0, 3, ['..FFFF..........................', '.F....F.........................'], { F: PAL.skyLight });
    p.map(0, 10, ['..................FFFF..........', '.................F....F.........'], { F: PAL.skyLight });
    p.set(9, 6, PAL.foam);
    p.set(26, 13, PAL.foam);
    p.draw(ctx);
  });
  mapTexture(
    scene,
    'rock',
    ['....SSSSSS....', '..SSmmSSSSSS..', '.SSmSSSSSSSSs.', 'SSSSSSSSSSSSss', 'SSSSSSSSSSSsss', '.sssssssssss..'],
    { S: PAL.steel, m: PAL.mist, s: PAL.stone },
  );
  mapTexture(
    scene,
    'bush',
    ['...LLLL.....', '.LLllLLLL...', 'LLllLLLLLL..', 'LLLLLLLLFFL.', 'LLLLLLFFFFFF', '.FFFFFFFFFF.'],
    { L: PAL.leaf, l: PAL.lime, F: PAL.forest },
  );
  // 올리브 나무
  mapTexture(
    scene,
    'tree',
    [
      '......llllll......',
      '....llOOOOOOll....',
      '...lOOOOOOOOOOl...',
      '..lOOOlOOOOOOOOl..',
      '.lOOOlOOOOOOOOOOl.',
      '.lOOOOOOOOOOOOOmm.',
      'lOOOOOOOOOOOOOOOml',
      'lOOOOOOOOOOOOOOmml',
      'lOOOOOOOOOOOOOmmml',
      '.mOOOOOOOOOOOmmmm.',
      '.mmOOOOOOOOmmmmmm.',
      '..mmmmOOOmmmmmmm..',
      '...mmmmmmmmmmmm...',
      '.....mmmbbmmm.....',
      '........bB........',
      '........bB........',
      '.......bbBb.......',
      '.......bBBb.......',
      '......bbBBBb......',
    ],
    { l: PAL.lime, O: PAL.olive, m: PAL.moss, b: PAL.bark, B: PAL.rust },
  );
  mapTexture(scene, 'cloud', ['......WWWW..........', '...WWWWWWWWW..WWW...', '.WWWWWWWWWWWWWWWWWW.', 'WWWWWWWWWWWWWWWWWWWW', 'MMMMMMMMMMMMMMMMMMMM'], { W: PAL.white, M: PAL.mist }, false);

  // ───────── 1장 빛 퍼즐 ─────────
  canvasTexture(scene, 'tile-floor', 16, 16, (ctx) => {
    const p = new Pix(16, 16);
    p.rect(0, 0, 16, 16, PAL.indigo);
    p.rect(0, 15, 16, 1, PAL.dusk);
    p.rect(15, 0, 1, 16, PAL.dusk);
    p.set(3, 4, PAL.navy);
    p.set(10, 9, PAL.navy);
    p.draw(ctx);
  });
  canvasTexture(scene, 'tile-wall', 16, 16, (ctx) => {
    const p = new Pix(16, 16);
    p.rect(0, 0, 16, 16, PAL.ink);
    for (const [x, y, w] of [
      [0, 1, 7],
      [8, 1, 8],
      [0, 9, 3],
      [4, 9, 8],
      [13, 9, 3],
    ]) {
      p.rect(x, y, w, 6, PAL.shadow);
      p.rect(x, y, w, 1, PAL.stone);
      p.rect(x, y + 5, w, 1, PAL.mauve);
    }
    p.draw(ctx);
  });
  for (const [key, flip] of [
    ['mirror-slash', false],
    ['mirror-back', true],
  ] as const) {
    const p = new Pix(16, 16);
    for (let i = 0; i < 11; i++) {
      const x = flip ? 2 + i : 13 - i;
      p.set(x, 2 + i, PAL.white);
      p.set(x + (flip ? 1 : -1), 2 + i, PAL.mist);
      p.set(x + (flip ? -1 : 1), 2 + i, PAL.steel);
    }
    p.rect(6, 13, 4, 2, PAL.rust);
    p.outline();
    pixTexture(scene, key, p);
  }
  mapTexture(scene, 'lamp-off', ['.....c.....', '....ccc....', '...........', 'CCCCCCCCCCC', '.CkkkkkkkC.', '..CCCCCCC..', '....CkC....', '...CCCCC...'], {
    c: PAL.shadow,
    C: PAL.rust,
    k: PAL.clay,
  });
  mapTexture(scene, 'lamp-on', ['.....g.....', '....gyg....', '...gyWyg...', 'CCCCfCCCCCC', '.CkkkkkkkC.', '..CCCCCCC..', '....CkC....', '...CCCCC...'], {
    g: PAL.flame,
    y: PAL.gold,
    W: PAL.white,
    f: PAL.orange,
    C: PAL.rust,
    k: PAL.honey,
  });
  mapTexture(scene, 'emitter', ['..oooo..', '.oyyyyo.', 'oyyWWyyo', 'oyWWWWyo', 'oyWWWWyo', 'oyyWWyyo', '.oyyyyo.', '..oooo..'], {
    o: PAL.orange,
    y: PAL.gold,
    W: PAL.white,
  });

  // ───────── 모닥불(3프레임) ─────────
  const fire = canvasTexture(scene, 'campfire', 48, 22, (ctx) => {
    const flames = [
      ['.....r.....', '....rfr....', '...rfyfr...', '..rfyWyfr..', '..rfyWyfr..', '...rfyfr...'],
      ['......r....', '....rfr....', '...rfyfr...', '...rfyWfr..', '..rfyWWyfr.', '...rfyfr...'],
      ['....r......', '...rfr..r..', '..rfyfrrf..', '..rfWyfr...', '..rfyWyfr..', '...rfyfr...'],
    ];
    flames.forEach((rows, f) => {
      const p = new Pix(16, 22);
      p.map(2, 6, rows, { r: PAL.red, f: PAL.flame, y: PAL.gold, W: PAL.white });
      p.map(1, 12, ['.LLLL..LLLL..', '..LLLLLLLL...', 'sS.LLLLLL.Ss.', 'SSs......sSS.'], { L: PAL.rust, s: PAL.stone, S: PAL.steel });
      p.outline();
      p.draw(ctx, f * 16, 0);
    });
  });
  for (let f = 0; f < 3; f++) fire.add(f, 0, f * 16, 0, 16, 22);
  scene.anims.create({ key: 'campfire-burn', frames: scene.anims.generateFrameNumbers('campfire', { frames: [0, 1, 2] }), frameRate: 7, repeat: -1 });

  // 부드러운 빛(원형 그라데이션)과 가장자리 어둠
  canvasTexture(scene, 'halo', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,236,190,0.9)');
    g.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  canvasTexture(scene, 'vignette', 320, 180, (ctx) => {
    const g = ctx.createRadialGradient(160, 90, 60, 160, 90, 200);
    g.addColorStop(0, 'rgba(46,34,47,0)');
    g.addColorStop(1, 'rgba(46,34,47,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 180);
  });
}

/** 좌표마다 같은 결과가 나오는 잔디 타일 고르기. 풀포기 약 8%, 꽃 약 3%. */
export function grassTile(x: number, y: number): string {
  const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  return h < 0.015 ? 'grass-flower' : h < 0.03 ? 'grass-flower2' : h < 0.11 ? 'grass-tuft' : 'grass';
}
