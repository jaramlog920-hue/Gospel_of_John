// 도트 그림을 코드로 그려 텍스처로 등록한다(이미지 파일 0바이트).
// 그림체: Resurrect 64 팔레트, 1px 외곽선, 두세 단계 명암. 캐릭터는 앞·뒤·옆 걷기 모습이 있다.
import Phaser from 'phaser';
import { PAL, css, WORLD } from './palette.ts';

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
  /** 여자: 겉옷(베일)을 머리 위로 늘어뜨린다. 이마 띠는 두르지 않는다(시대 고증). */
  veil?: number;
  veilShade?: number;
  /** 성인 남자: 짧은 머리에 수염 */
  beard?: boolean;
  /** 튜닉의 세로 줄무늬(클라비) */
  clavi?: number;
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
  const veil = s.veil;
  const veilShade = s.veilShade ?? s.robeShade;

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
    if (s.beard) {
      rect(8, t + 7, 3, 2, hair);
      set(11, t + 7, hair);
    }
    if (veil !== undefined) {
      // 베일: 머리 위에서 뒤통수를 덮고 어깨까지 늘어진다.
      rect(5, t, 6, 1, veil);
      rect(4, t + 1, 8, 3, veil);
      rect(4, t + 4, 4, 8, veil);
      rect(4, t + 4, 1, 8, veilShade);
    }
    // 몸통
    for (let y = b0; y < feet; y++) {
      const wide = y >= b0 + 5;
      rect(wide ? 5 : 6, y, wide ? 7 : 5, 1, s.robe);
      set(wide ? 5 : 6, y, s.robeShade);
    }
    rect(6, b0 + 4, 5, 1, s.sash);
    if (s.clavi !== undefined) for (let y = b0 + 5; y < feet; y++) set(9, y, s.clavi);
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
    if (s.beard) {
      rect(5, t + 7, 6, 1, hair);
      rect(6, t + 8, 4, 1, hair);
      set(7, t + 7, PAL.bark); // 입
      set(8, t + 7, PAL.bark);
    }
  } else {
    rect(4, t + 3, 8, 5, hair);
    rect(5, t + 8, 6, 1, hair);
    rect(10, t + 2, 2, 6, hairShade);
    set(8, t + 8, skin);
  }
  if (veil !== undefined) {
    // 베일: 이마 위를 덮고 양옆으로 어깨까지 늘어진다(이마 띠 없음).
    rect(5, t, 6, 1, veil);
    rect(4, t + 1, 8, 3, veil);
    rect(3, t + 3, 2, 9, veil);
    rect(11, t + 3, 2, 9, veilShade);
    if (dir === 'up') rect(4, t + 3, 8, 9, veil), rect(9, t + 3, 3, 9, veilShade);
  }
  // 몸통
  for (let y = b0; y < feet; y++) {
    const wide = y >= b0 + 5;
    rect(wide ? 4 : 5, y, wide ? 8 : 6, 1, s.robe);
    rect(wide ? 10 : 9, y, 2, 1, s.robeShade);
  }
  rect(5, b0 + 4, 6, 1, s.sash);
  if (s.clavi !== undefined)
    for (let y = b0; y < feet; y++) if (y !== b0 + 4) set(6, y, s.clavi), set(9, y, s.clavi);
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

/** 16×16 앉은 사람(무리). 남자는 짧은 머리와 수염, 여자는 베일. */
function makeSitter(scene: Phaser.Scene, key: string, robe: number, robeShade: number, woman: boolean, cover: number, coverShade: number) {
  const p = new Pix(16, 16);
  const hair = PAL.mud;
  p.rect(5, 3, 6, 4, PAL.cream);
  p.rect(10, 3, 1, 4, PAL.peach);
  p.set(6, 4, PAL.ink);
  p.set(9, 4, PAL.ink);
  if (woman) {
    p.rect(5, 1, 6, 1, cover);
    p.rect(4, 2, 8, 1, cover);
    p.rect(3, 3, 2, 6, cover);
    p.rect(11, 3, 2, 6, coverShade);
    p.set(5, 5, PAL.salmon);
  } else {
    p.rect(5, 1, 6, 1, hair);
    p.rect(4, 2, 8, 1, hair);
    p.rect(4, 3, 1, 3, hair);
    p.rect(11, 3, 1, 3, hair);
    p.rect(5, 6, 6, 1, hair);
  }
  p.rect(4, 7, 8, 4, robe);
  p.rect(2, 10, 12, 3, robe);
  p.rect(10, 7, 2, 4, robeShade);
  p.rect(11, 10, 3, 3, robeShade);
  p.rect(6, 10, 4, 1, robeShade);
  p.outline();
  pixTexture(scene, key, p);
}

// 옷감: 1세기 갈릴리 서민의 양모·아마 옷은 흰빛·베이지·갈색이 많고, 염색은 흙빛·쪽빛·꼭두서니 계열이었다.
const ROBE_SET: [number, number][] = [
  [PAL.khaki, PAL.taupe],
  [PAL.white, PAL.mist], // 흰 아마포(피부색과 같은 크림색 옷은 쓰지 않는다)
  [PAL.tan, PAL.clay],
  [PAL.mist, PAL.steel],
  [PAL.navy, PAL.indigo],
  [PAL.clay, PAL.rust],
  [PAL.sage, PAL.moss],
  [PAL.salmon, PAL.brick],
];
// 베일은 피부색과 헷갈리지 않는 천 색만 쓴다(크림·살구색 금지).
const VEIL_SET: [number, number][] = [
  [PAL.mist, PAL.steel],
  [PAL.sage, PAL.moss],
  [PAL.navy, PAL.indigo],
  [PAL.khaki, PAL.taupe],
];

export function generateTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('player')) return;
  generateProps(scene);
  generateGrounds(scene);

  // 주인공·아이들: 맨머리, 허리띠를 맨 짧은 튜닉
  makePerson(scene, 'player', { robe: PAL.aqua, robeShade: PAL.teal, sash: PAL.mud, hair: PAL.mud, hairShade: PAL.ink, clavi: PAL.teal, kid: true });
  makePerson(scene, 'kid-cry', { robe: PAL.rose, robeShade: PAL.berry, sash: PAL.bark, hair: PAL.rust, hairShade: PAL.bark, kid: true });
  makePerson(scene, 'kid-lunch', { robe: PAL.white, robeShade: PAL.mist, sash: PAL.clay, hair: PAL.mud, kid: true });
  makePerson(scene, 'light-figure', { robe: PAL.white, robeShade: PAL.mist, sash: PAL.khaki, hair: PAL.mud, beard: true, clavi: PAL.steel });
  // 무리: crowd1·4·5는 남자(짧은 머리·수염), crowd0·2·3은 여자(베일)
  const women = new Set([0, 2, 3]);
  for (let i = 0; i < 6; i++) {
    const [robe, robeShade] = ROBE_SET[i];
    const [veil, veilShade] = VEIL_SET[i % VEIL_SET.length];
    const woman = women.has(i);
    makePerson(scene, `crowd${i}`, {
      robe,
      robeShade,
      sash: i % 2 ? PAL.bark : PAL.mud,
      hair: i === 4 ? PAL.steel : PAL.mud, // crowd4: 흰머리 노인
      hairShade: PAL.ink,
      skin: i % 2 ? PAL.tan : PAL.cream,
      skinShade: i % 2 ? PAL.clay : PAL.peach,
      ...(woman ? { veil, veilShade } : { beard: true, clavi: robeShade }),
    });
  }
  ROBE_SET.forEach(([r, rs], i) => makeSitter(scene, `sitter${i}`, r, rs, i % 3 === 1, ...VEIL_SET[i % VEIL_SET.length]));

  // ───────── 음식과 바구니 ─────────
  // 보리떡: 1세기 떡은 납작하고 둥근 모양이었다.
  mapTexture(scene, 'bread', ['..hhhhhh..', '.hHhHHhHh.', 'hHHHHHHHHc', '.cccccccc.'], {
    h: PAL.khaki,
    H: PAL.honey,
    c: PAL.clay,
  });
  mapTexture(scene, 'fish', ['..sssss..s.', '.sMMMMMs.ss', 'sMeMMMMMss.', 'sSSSSSSSss.', '.sSSSSSs.ss', '..sssss..s.'], {
    s: PAL.steel,
    M: PAL.mist,
    S: PAL.steel,
    e: PAL.ink,
  });
  mapTexture(scene, 'crumb', ['hh', 'hc'], { h: PAL.khaki, c: PAL.clay });
  mapTexture(scene, 'fig', ['..g..', '.ww..', 'wwWw.', 'wWwww', 'wwwwp', '.www.'], {
    g: PAL.forest,
    w: PAL.purple,
    W: PAL.lilac,
    p: PAL.grape,
  });
  const basketRows = ['WWWWWWWWWWWW', 'WdWdWdWdWdWd', 'WWWWWWWWWWWW', '.WdWdWdWdWd.', '.WWWWWWWWWW.', '..dddddddd..'];
  mapTexture(scene, 'basket', basketRows, { W: PAL.khaki, d: PAL.taupe });
  mapTexture(scene, 'basket-full', ['.hHhHhhHhc..', 'hHhHhHhHhHc.', ...basketRows], {
    h: PAL.khaki,
    H: PAL.honey,
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
    p.rect(0, 0, 16, 16, WORLD.sand);
    for (const [x, y] of [
      [3, 2],
      [10, 5],
      [6, 11],
      [13, 13],
    ])
      p.set(x, y, WORLD.sandSpeck);
    p.draw(ctx);
  });
  canvasTexture(scene, 'water', 32, 16, (ctx) => {
    const p = new Pix(32, 16);
    p.rect(0, 0, 32, 16, WORLD.water);
    p.map(0, 3, ['..FFFF..........................', '.F....F.........................'], { F: WORLD.waterHi });
    p.map(0, 10, ['..................FFFF..........', '.................F....F.........'], { F: WORLD.waterHi });
    p.set(9, 6, WORLD.waterFoam);
    p.set(26, 13, WORLD.waterFoam);
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
  // 거울: 1세기에는 유리 거울이 아니라 청동을 갈아 만든 거울을 썼다.
  for (const [key, flip] of [
    ['mirror-slash', false],
    ['mirror-back', true],
  ] as const) {
    const p = new Pix(16, 16);
    for (let i = 0; i < 11; i++) {
      const x = flip ? 2 + i : 13 - i;
      p.set(x, 2 + i, PAL.gold);
      p.set(x + (flip ? 1 : -1), 2 + i, PAL.honey);
      p.set(x + (flip ? -1 : 1), 2 + i, PAL.tan);
    }
    p.set(flip ? 5 : 10, 5, PAL.white);
    p.rect(6, 13, 4, 2, PAL.rust);
    p.outline();
    pixTexture(scene, key, p);
  }
  // 등잔: 1세기 갈릴리의 흙 기름 등잔(납작한 몸통, 심지를 꽂는 부리)
  mapTexture(scene, 'lamp-off', ['...........', '...........', '...........', '..ccccc....', '.cCoCCCcc..', 'cCCCCCCCCcw', '.cCCCCCcc..', '..ccccc....'], {
    c: PAL.rust,
    C: PAL.clay,
    o: PAL.bark,
    w: PAL.mud,
  });
  mapTexture(scene, 'lamp-on', ['.........r.', '........rfr', '........fyf', '..ccccc.yWy', '.cCoCCCccf.', 'cCCCCCCCCcw', '.cCCCCCcc..', '..ccccc....'], {
    c: PAL.rust,
    C: PAL.tan,
    o: PAL.bark,
    w: PAL.mud,
    r: PAL.red,
    f: PAL.flame,
    y: PAL.gold,
    W: PAL.white,
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
    g.addColorStop(0, 'rgba(47,75,85,0)');
    g.addColorStop(1, 'rgba(47,75,85,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 180);
  });
}

/** 좌표마다 같은 결과가 나오는 잔디 타일 고르기. 풀포기 약 8%, 꽃 약 3%. */
export function grassTile(x: number, y: number): string {
  const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  return h < 0.015 ? 'grass-flower' : h < 0.03 ? 'grass-flower2' : h < 0.11 ? 'grass-tuft' : 'grass';
}

// ───────── 이야기 장면의 소품(1세기 유대·갈릴리 고증) ─────────
export function generateProps(scene: Phaser.Scene) {
  if (scene.textures.exists('house')) return;

  // 집: 갈릴리는 검은 현무암, 유대(예루살렘·베다니)는 석회암을 쌓은 벽. 나무 들보를 얹은 평지붕.
  for (const [key, base, a, b] of [
    ['house', PAL.shadow, PAL.mauve, PAL.stone],
    ['house-lime', PAL.steel, PAL.mist, PAL.white],
  ] as const) {
    const p = new Pix(34, 30);
    p.rect(2, 6, 30, 22, base);
    for (let y = 7; y < 28; y += 3) for (let x = 2 + ((y / 3) % 2) * 3; x < 32; x += 6) p.rect(x, y, 5, 2, (x + y) % 4 ? a : b);
    p.rect(0, 3, 34, 3, WORLD.roof); // 흙을 다진 지붕
    p.rect(0, 5, 34, 1, WORLD.roofLine);
    for (let x = 2; x < 34; x += 5) p.set(x, 6, PAL.rust); // 들보 끝
    p.rect(14, 16, 6, 12, PAL.ink); // 문
    p.rect(14, 16, 6, 1, PAL.rust);
    p.rect(24, 12, 4, 4, PAL.ink); // 창
    p.outline();
    pixTexture(scene, key, p);
  }
  // 성전 주랑의 석회암 기둥
  mapTexture(
    scene,
    'pillar',
    ['CCCCCCCCCC', '.cccccccc.', '..mCCCCm..', ...Array(26).fill('..mCCCCs..'), '..mCCCCs..', '.cccccccc.', 'CCCCCCCCCC'],
    { C: WORLD.pillar, c: WORLD.pillarShade, m: PAL.white, s: WORLD.pillarShade },
  );
  // 우물: 돌을 둥글게 쌓은 입구
  mapTexture(scene, 'well', ['....ssssssss....', '..ssMMMMMMMMss..', '.sMiiiiiiiiiiMs.', 'sMMiiiiiiiiiiMMs', 'SSSSSSSSSSSSSSSS', 'SsSSsSSsSSsSSsSS', 'SSSSSSSSSSSSSSSS', '.SSSSSSSSSSSSSS.'], {
    s: PAL.stone,
    M: PAL.steel,
    i: PAL.ink,
    S: PAL.stone,
  });
  // 물 항아리(돌항아리)
  mapTexture(scene, 'jar', ['.MMMM.', 'MssssM', '.SSSS.', 'SSSSSS', 'SSSSSs', 'SSSSSs', 'SSSSss', '.SSss.'], { M: PAL.steel, s: PAL.ink, S: PAL.mist });
  // 갈대
  mapTexture(scene, 'reeds', ['.k...k..', '.g..kg..', 'kg..gg.k', 'gg.gg..g', 'g.gg.gg.', 'gggg.gg.', '.gg.gg..', '.g..g...'], { g: WORLD.reed, k: WORLD.wildSpeck });
  // 종려나무(대추야자)
  mapTexture(
    scene,
    'palm',
    [
      '....l......l.....',
      '..lLLl...lLLl....',
      '.lL..LlllL..Ll...',
      'lL....LLLL...Ll..',
      'L...lLLLLLLl..L..',
      '...lL..bb..Ll....',
      '..lL...bB...Ll...',
      '..L....bB....L...',
      '.......bB........',
      '.......bB........',
      '........bB.......',
      '........bB.......',
      '........bB.......',
      '.......bbBB......',
    ],
    { l: PAL.leaf, L: PAL.forest, b: PAL.taupe, B: PAL.rust },
  );
  // 소(성전 뜰에서 팔던 제물용 소)
  mapTexture(scene, 'ox', ['h.............h', 'hh..........hh.', '.BBBBBBBBBBBBBb', 'BBBBBBBBBBBBBeb', 'BBBBBBBBBBBBBBn', 'BBBBBBBBBBBBBb.', '.l.l.....l.l...', '.l.l.....l.l...'], {
    h: PAL.mist,
    B: PAL.clay,
    b: PAL.rust,
    e: PAL.ink,
    n: PAL.peach,
    l: PAL.bark,
  });
  // 양
  mapTexture(scene, 'sheep', ['.WWWWW...', 'WWWWWWWhh', 'WWWWWWWhe', 'WWWWWWWh.', '.l.l.l.l.'], { W: PAL.white, h: PAL.mud, e: PAL.ink, l: PAL.mud });
  // 돌담 한 칸
  mapTexture(scene, 'stonewall', ['.SSs.SSSs.SSs...', 'SSSSsSSSSsSSSSs.', 'sSSSSsSSSSsSSSSs', 'SSsSSSSsSSSSsSSs', 'ssssssssssssssss'], { S: PAL.stone, s: PAL.shadow });
  // 바위 무덤: 바위를 파낸 입구와 둥근 막음돌
  mapTexture(
    scene,
    'tomb',
    [
      '.......KKKKKKKKKKK.........',
      '....KKKkkkkkkkkkkKKK.......',
      '..KKkkkkkkkkkkkkkkkkKK.....',
      '.KkkkkkkkkkkkkkkkkkkkkK....',
      'KkkkkkiiiiiiikkkkkkkkkkK...',
      'Kkkkkiiiiiiiiikkkkkkkkkk...',
      'KkkkkiiiiiiiiikkkkkkkkkkK..',
      'KkkkkiiiiiiiiikkkkkkkkkkK..',
      'KkkkkiiiiiiiiikkkkkkkkkkkK.',
      'KkkkkiiiiiiiiikkkkkkkkkkkK.',
      'KKKKKKKKKKKKKKKKKKKKKKKKKKK',
    ],
    { K: PAL.taupe, k: PAL.khaki, i: PAL.ink },
  );
  mapTexture(scene, 'stone-round', ['...SSSS...', '.SSMMMSSs.', 'SSMSSSSSss', 'SMSSSSSSss', 'SSSSSSSSss', 'SSSSSSSsss', '.SSSSSsss.', '...ssss...'], {
    S: PAL.steel,
    M: PAL.mist,
    s: PAL.stone,
  });
  // 멀리 보이는 언덕 위 형틀 세 개(작고 어둡게, 원칙 6)
  mapTexture(scene, 'crosses', ['....i..........i..........i....', '..iiiii......iiiii......iiiii..', '....i..........i..........i....', '....i..........i..........i....', '....i..........i..........i....', '....i..........i..........i....', '....i..........i..........i....'], { i: PAL.ink }, false);
  // 기대어 앉는 낮은 식탁과 방석
  mapTexture(scene, 'table', ['WWWWWWWWWWWWWWWWWWWWWWWW', 'ttttttttttttttttttttttttt'.slice(0, 24), '.r....................r.', '.r....................r.'], { W: PAL.khaki, t: PAL.taupe, r: PAL.rust });
  mapTexture(scene, 'cushion', ['.pppppppp.', 'pPPPPPPPPp', 'pPPPPPPPPp', '.pppppppp.'], { p: PAL.brick, P: PAL.clay });
  // 갈릴리 고깃배(나무)
  mapTexture(
    scene,
    'boat',
    ['...............m...............', '...............m...............', 'W..............m..............W', 'WW.............m.............WW', 'WtWWWWWWWWWWWWWWWWWWWWWWWWWWWtW', '.WtttttttttttttttttttttttttttW.', '..WWWWWWWWWWWWWWWWWWWWWWWWWWW..', '....bbbbbbbbbbbbbbbbbbbbbbb....'],
    { W: PAL.taupe, t: PAL.khaki, b: PAL.rust, m: PAL.mud },
  );
  // 포도나무 시렁
  mapTexture(scene, 'vine', ['bbbbbbbbbbbbbbbb', '.gGg..gGg..gGg..', 'gGGgggGGgggGGgg.', '.gpg.gGpg..gpg..', '..pp..gpp...pp..', '..b.....b.....b.', '..b.....b.....b.', '..b.....b.....b.'], {
    b: PAL.taupe,
    g: PAL.forest,
    G: PAL.leaf,
    p: PAL.purple,
  });
  // 두루마리 표시(다음에 읽을 곳)
  mapTexture(scene, 'scroll-mark', ['.rr....rr.', 'rCCCCCCCCr', '.CccccccC.', '.CCCCCCCC.', '.CccccC C.'.replace(' ', 'C'), '.CCCCCCCC.', 'rCCCCCCCCr', '.rr....rr.'], {
    r: PAL.rust,
    C: PAL.cream,
    c: PAL.peach,
  });
}

/** 이야기 장면의 바닥 타일 */
export function generateGrounds(scene: Phaser.Scene) {
  if (scene.textures.exists('paving')) return;
  const tile = (key: string, draw: (p: Pix) => void) => {
    const p = new Pix(16, 16);
    draw(p);
    pixTexture(scene, key, p);
  };
  // 석회암 포석(성전·관저): 옅은 회백색
  tile('paving', (p) => {
    p.rect(0, 0, 16, 16, WORLD.paving);
    p.rect(0, 7, 16, 1, WORLD.pavingLine);
    p.rect(0, 15, 16, 1, WORLD.pavingLine);
    p.rect(9, 0, 1, 7, WORLD.pavingLine);
    p.rect(3, 8, 1, 7, WORLD.pavingLine);
    p.set(5, 3, WORLD.pavingHi);
    p.set(12, 11, WORLD.pavingHi);
  });
  // 현무암 포석(갈릴리 회당·골목)
  tile('basalt', (p) => {
    p.rect(0, 0, 16, 16, WORLD.basalt);
    p.rect(0, 7, 16, 1, WORLD.basaltLine);
    p.rect(0, 15, 16, 1, WORLD.basaltLine);
    p.rect(7, 0, 1, 7, WORLD.basaltLine);
    p.rect(12, 8, 1, 7, WORLD.basaltLine);
    p.set(3, 3, WORLD.basaltHi);
  });
  // 다진 흙길: 마른 회갈색
  tile('dirt', (p) => {
    p.rect(0, 0, 16, 16, WORLD.dust);
    for (const [x, y] of [
      [3, 4],
      [11, 9],
      [6, 13],
      [14, 2],
      [8, 6],
    ])
      p.set(x, y, WORLD.dustSpeck);
    p.set(12, 14, WORLD.dustHi);
    p.set(1, 10, WORLD.dustHi);
  });
  // 흙을 바른 실내 바닥
  tile('floor', (p) => {
    p.rect(0, 0, 16, 16, WORLD.floor);
    p.set(4, 5, WORLD.floorSpeck);
    p.set(12, 11, WORLD.floorSpeck2);
  });
  // 나무 배 갑판
  tile('deck', (p) => {
    p.rect(0, 0, 16, 16, WORLD.deck);
    for (const y of [0, 5, 10, 15]) p.rect(0, y, 16, 1, WORLD.deckLine);
    p.set(7, 2, PAL.mud);
    p.set(12, 12, PAL.mud);
  });
  // 광야: 마른 흙과 드문드문 마른 풀
  tile('wild', (p) => {
    p.rect(0, 0, 16, 16, WORLD.wild);
    p.map(10, 10, ['o.o', '.o.'], { o: WORLD.wildGrass });
    p.set(3, 4, WORLD.wildSpeck);
  });
}
