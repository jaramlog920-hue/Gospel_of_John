// 도트 스프라이트를 코드로 그려 텍스처로 등록한다(초기 로딩 0바이트).
import Phaser from 'phaser';
import { PAL, css } from './palette.ts';

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, color: number, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = css(color);
  ctx.fillRect(x, y, w, h);
}

/** 문자 지도로 그리는 작은 그림. '.'은 투명. */
function drawMap(ctx: Ctx, ox: number, oy: number, map: string[], colors: Record<string, number>) {
  map.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && px(ctx, colors[ch], ox + x, oy + y)));
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
  return tex;
}

export interface PersonStyle {
  robe: number;
  sash: number;
  hair: number;
  skin?: number;
  headcloth?: number;
  kid?: boolean;
  glow?: boolean;
}

/** 16×24 사람, 걷기 4프레임(0 서기, 1 왼발, 2 서기, 3 오른발) */
function drawPerson(ctx: Ctx, ox: number, frame: number, s: PersonStyle) {
  const skin = s.skin ?? PAL.skin;
  const top = s.kid ? 5 : 1;
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const y0 = top + bob;
  // 머리
  px(ctx, skin, ox + 5, y0 + 2, 6, 6);
  if (s.headcloth !== undefined) {
    px(ctx, s.headcloth, ox + 4, y0, 8, 3);
    px(ctx, s.headcloth, ox + 4, y0 + 3, 1, 6);
    px(ctx, s.headcloth, ox + 11, y0 + 3, 1, 6);
  } else {
    px(ctx, s.hair, ox + 5, y0 + 1, 6, 2);
    px(ctx, s.hair, ox + 4, y0 + 2, 1, 3);
    px(ctx, s.hair, ox + 11, y0 + 2, 1, 3);
  }
  px(ctx, PAL.ink, ox + 6, y0 + 5);
  px(ctx, PAL.ink, ox + 9, y0 + 5);
  // 몸통(겉옷)
  const bodyTop = y0 + 8;
  const bodyBottom = 21;
  for (let y = bodyTop; y < bodyBottom; y++) {
    const widen = y > bodyTop + 6 ? 1 : 0;
    px(ctx, s.robe, ox + 4 - widen, y, 8 + widen * 2, 1);
  }
  px(ctx, s.sash, ox + 4, bodyTop + 4, 8, 1);
  // 팔
  const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  px(ctx, s.robe, ox + 3, bodyTop + 1 + swing, 1, 4);
  px(ctx, s.robe, ox + 12, bodyTop + 1 - swing, 1, 4);
  px(ctx, skin, ox + 3, bodyTop + 5 + swing);
  px(ctx, skin, ox + 12, bodyTop + 5 - swing);
  // 발
  const lf = frame === 1 ? 1 : 0;
  const rf = frame === 3 ? 1 : 0;
  px(ctx, PAL.bark, ox + 5, 21 + lf, 2, 2 - lf);
  px(ctx, PAL.bark, ox + 9, 21 + rf, 2, 2 - rf);
  if (s.glow) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,240,200,0.25)';
    ctx.fillRect(ox, 0, 16, 24);
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function makePerson(scene: Phaser.Scene, key: string, style: PersonStyle) {
  const tex = canvasTexture(scene, key, 64, 24, (ctx) => {
    for (let f = 0; f < 4; f++) drawPerson(ctx, f * 16, f, style);
  });
  for (let f = 0; f < 4; f++) tex.add(f, 0, f * 16, 0, 16, 24);
  scene.anims.create({
    key: `${key}-walk`,
    frames: scene.anims.generateFrameNumbers(key, { frames: [0, 1, 2, 3] }),
    frameRate: 8,
    repeat: -1,
  });
}

/** 16×14 앉은 사람(무리) */
function makeSitter(scene: Phaser.Scene, key: string, robe: number, head: number) {
  canvasTexture(scene, key, 16, 14, (ctx) => {
    px(ctx, PAL.skin, 5, 1, 6, 5);
    px(ctx, head, 4, 0, 8, 2);
    px(ctx, PAL.ink, 6, 3);
    px(ctx, PAL.ink, 9, 3);
    px(ctx, robe, 3, 6, 10, 6);
    px(ctx, robe, 2, 10, 12, 3);
  });
}

export const ROBES = [PAL.wine, PAL.olive, PAL.sea, PAL.amber, PAL.stone, PAL.teal, PAL.wood, PAL.rose];
export const HEADS = [PAL.mist, PAL.parchment, PAL.hair, PAL.sand, PAL.white];

export function generateTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('player')) return;

  makePerson(scene, 'player', { robe: PAL.teal, sash: PAL.gold, hair: PAL.hair, kid: true });
  makePerson(scene, 'kid-cry', { robe: PAL.rose, sash: PAL.white, hair: PAL.bark, kid: true });
  makePerson(scene, 'kid-lunch', { robe: PAL.sandDark, sash: PAL.wood, hair: PAL.hair, kid: true });
  makePerson(scene, 'light-figure', { robe: PAL.white, sash: PAL.gold, hair: PAL.hair, glow: true });
  for (let i = 0; i < 6; i++) {
    makePerson(scene, `crowd${i}`, {
      robe: ROBES[i % ROBES.length],
      sash: ROBES[(i + 3) % ROBES.length],
      hair: PAL.hair,
      headcloth: HEADS[i % HEADS.length],
      skin: i % 2 ? PAL.skinDark : PAL.skin,
    });
  }
  ROBES.forEach((r, i) => makeSitter(scene, `sitter${i}`, r, HEADS[i % HEADS.length]));

  // 음식과 바구니
  canvasTexture(scene, 'bread', 10, 7, (ctx) =>
    drawMap(ctx, 0, 0, ['..cccccc..', '.cbbbbbbc.', 'cbbbbbbbbc', 'cbbbbbbbbc', 'cbbbbbbbbc', '.cccccccc.', '..........'], {
      c: PAL.crust,
      b: PAL.bread,
    }),
  );
  canvasTexture(scene, 'fish', 11, 6, (ctx) =>
    drawMap(ctx, 0, 0, ['..sssss..s.', '.sLLLLLs.ss', 'sLeLLLLLss.', 'sLLLLLLLss.', '.sLLLLLs.ss', '..sssss..s.'], {
      s: PAL.shadow,
      L: PAL.mist,
      e: PAL.ink,
    }),
  );
  canvasTexture(scene, 'crumb', 4, 4, (ctx) => drawMap(ctx, 0, 0, ['.cc.', 'cbbc', 'cbbc', '.cc.'], { c: PAL.crust, b: PAL.bread }));
  canvasTexture(scene, 'fig', 7, 7, (ctx) =>
    drawMap(ctx, 0, 0, ['...g...', '..ww...', '.wwww..', 'wwwwww.', 'wwrwww.', '.wwww..', '..ww...'], {
      g: PAL.grassDark,
      w: PAL.wine,
      r: PAL.rose,
    }),
  );
  canvasTexture(scene, 'basket', 14, 10, (ctx) =>
    drawMap(
      ctx,
      0,
      0,
      [
        '...wwwwwwww...',
        '..w........w..',
        '.w..........w.',
        'WWWWWWWWWWWWWW',
        'WdWdWdWdWdWdWW',
        'WWWWWWWWWWWWWW',
        '.WdWdWdWdWdWW.',
        '.WWWWWWWWWWWW.',
        '..WdWdWdWdWW..',
        '...WWWWWWWW...',
      ],
      { w: PAL.wood, W: PAL.sandDark, d: PAL.wood },
    ),
  );
  canvasTexture(scene, 'basket-full', 14, 10, (ctx) => {
    drawMap(ctx, 0, 0, ['...wwwwwwww...', '..wbcbbcbbcw..', '.wbbcbbbcbbbw.'], { w: PAL.wood, b: PAL.bread, c: PAL.crust });
    drawMap(
      ctx,
      0,
      3,
      ['WWWWWWWWWWWWWW', 'WdWdWdWdWdWdWW', 'WWWWWWWWWWWWWW', '.WdWdWdWdWdWW.', '.WWWWWWWWWWWW.', '..WdWdWdWdWW..', '...WWWWWWWW...'],
      { W: PAL.sandDark, d: PAL.wood },
    );
  });

  // 말풍선 아이콘 배경
  canvasTexture(scene, 'bubble', 16, 14, (ctx) =>
    drawMap(
      ctx,
      0,
      0,
      [
        '..wwwwwwwwwwww..',
        '.wWWWWWWWWWWWWw.',
        'wWWWWWWWWWWWWWWw',
        'wWWWWWWWWWWWWWWw',
        'wWWWWWWWWWWWWWWw',
        'wWWWWWWWWWWWWWWw',
        'wWWWWWWWWWWWWWWw',
        'wWWWWWWWWWWWWWWw',
        'wWWWWWWWWWWWWWWw',
        '.wWWWWWWWWWWWWw.',
        '..wwwwwWWwwwww..',
        '......wWw.......',
        '......ww........',
        '................',
      ],
      { w: PAL.ink, W: PAL.white },
    ),
  );

  // 땅
  canvasTexture(scene, 'grass', 16, 16, (ctx) => {
    px(ctx, PAL.grass, 0, 0, 16, 16);
    for (const [x, y] of [[2, 3], [9, 1], [13, 7], [5, 10], [11, 13], [1, 14], [7, 6]]) {
      px(ctx, PAL.grassDark, x, y, 1, 2);
      px(ctx, PAL.grassDark, x + 1, y + 1);
    }
  });
  canvasTexture(scene, 'sand', 16, 16, (ctx) => {
    px(ctx, PAL.sand, 0, 0, 16, 16);
    for (const [x, y] of [[3, 2], [10, 5], [6, 11], [13, 13], [1, 8]]) px(ctx, PAL.sandDark, x, y);
  });
  canvasTexture(scene, 'water', 16, 16, (ctx) => {
    px(ctx, PAL.sea, 0, 0, 16, 16);
    px(ctx, PAL.seaLight, 2, 4, 5, 1);
    px(ctx, PAL.seaLight, 9, 11, 5, 1);
  });
  canvasTexture(scene, 'rock', 16, 12, (ctx) =>
    drawMap(
      ctx,
      0,
      0,
      [
        '....ssssss......',
        '..sSSSSSSSss....',
        '.sSmmSSSSSSSs...',
        '.sSmSSSSSSSSSs..',
        'sSSSSSSSSSSSSSs.',
        'sSSSSSSSSSSSSSSs',
        'sSSSSSSSSSSSSSSs',
        'sSSSSSSSSSSSSSSs',
        '.sSSSSSSSSSSSSs.',
        '..ssssssssssss..',
        '................',
        '................',
      ],
      { s: PAL.shadow, S: PAL.stone, m: PAL.mist },
    ),
  );

  // 1장 빛 퍼즐 타일
  canvasTexture(scene, 'tile-floor', 16, 16, (ctx) => {
    px(ctx, PAL.dusk, 0, 0, 16, 16);
    px(ctx, PAL.night, 0, 15, 16, 1);
    px(ctx, PAL.night, 15, 0, 1, 16);
  });
  canvasTexture(scene, 'tile-wall', 16, 16, (ctx) => {
    px(ctx, PAL.shadow, 0, 0, 16, 16);
    px(ctx, PAL.stone, 1, 1, 6, 6);
    px(ctx, PAL.stone, 9, 1, 6, 6);
    px(ctx, PAL.stone, 5, 9, 6, 6);
    px(ctx, PAL.stone, 0, 9, 3, 6);
    px(ctx, PAL.stone, 13, 9, 3, 6);
  });
  for (const [key, flip] of [['mirror-slash', false], ['mirror-back', true]] as const) {
    canvasTexture(scene, key, 16, 16, (ctx) => {
      px(ctx, PAL.wood, 6, 13, 4, 3);
      for (let i = 0; i < 12; i++) {
        const x = flip ? 2 + i : 13 - i;
        px(ctx, PAL.mist, x, 2 + i, 2, 1);
        px(ctx, PAL.white, x, 2 + i);
      }
    });
  }
  canvasTexture(scene, 'lamp-off', 16, 16, (ctx) =>
    drawMap(
      ctx,
      0,
      0,
      [
        '................',
        '................',
        '................',
        '................',
        '.......s........',
        '......sss.......',
        '................',
        '..cccccccccccc..',
        '.cCCCCCCCCCCCCc.',
        '..cCCCCCCCCCCc..',
        '...cccccccccc...',
        '.......cc.......',
        '......cCCc......',
        '.....cccccc.....',
        '................',
        '................',
      ],
      { c: PAL.bark, C: PAL.wood, s: PAL.shadow },
    ),
  );
  canvasTexture(scene, 'lamp-on', 16, 16, (ctx) =>
    drawMap(
      ctx,
      0,
      0,
      [
        '.......g........',
        '......gyg.......',
        '......gyg.......',
        '.....gyWyg......',
        '......aga.......',
        '.......a........',
        '................',
        '..cccccccccccc..',
        '.cCCCCCCCCCCCCc.',
        '..cCCCCCCCCCCc..',
        '...cccccccccc...',
        '.......cc.......',
        '......cCCc......',
        '.....cccccc.....',
        '................',
        '................',
      ],
      { c: PAL.crust, C: PAL.bread, g: PAL.amber, y: PAL.gold, W: PAL.white, a: PAL.ember },
    ),
  );
  canvasTexture(scene, 'emitter', 16, 16, (ctx) => {
    px(ctx, PAL.gold, 4, 4, 8, 8);
    px(ctx, PAL.white, 6, 6, 4, 4);
    px(ctx, PAL.amber, 3, 5, 1, 6);
    px(ctx, PAL.amber, 12, 5, 1, 6);
    px(ctx, PAL.amber, 5, 3, 6, 1);
    px(ctx, PAL.amber, 5, 12, 6, 1);
  });

  // 모닥불(3프레임)
  const fire = canvasTexture(scene, 'campfire', 48, 20, (ctx) => {
    const flames = [
      ['......a.........', '.....aya........', '....ayWya.......', '...aayWyaa......', '...ayWWWya......', '....ayWya.......'],
      ['.......a........', '......aya.......', '.....ayWya......', '....ayWWya......', '...aayWWyaa.....', '....ayWya.......'],
      ['.....a..........', '....aya..a......', '...ayWyaaya.....', '...ayWWya.......', '...aayWyaa......', '....ayWya.......'],
    ];
    flames.forEach((rows, f) => {
      drawMap(ctx, f * 16, 6, rows, { a: PAL.ember, y: PAL.amber, W: PAL.gold });
      drawMap(ctx, f * 16, 12, ['.bbbb....bbbb...', '..bbbbbbbbbb....', '....bbbbbb......', '..bb......bb....'], { b: PAL.wood });
    });
  });
  for (let f = 0; f < 3; f++) fire.add(f, 0, f * 16, 0, 16, 20);
  scene.anims.create({ key: 'campfire-burn', frames: scene.anims.generateFrameNumbers('campfire', { frames: [0, 1, 2] }), frameRate: 6, repeat: -1 });

  // 부드러운 빛(원형 그라데이션)과 가장자리 흐림
  canvasTexture(scene, 'halo', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,244,214,0.9)');
    g.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  canvasTexture(scene, 'vignette', 320, 180, (ctx) => {
    const g = ctx.createRadialGradient(160, 90, 60, 160, 90, 200);
    g.addColorStop(0, 'rgba(26,20,35,0)');
    g.addColorStop(1, 'rgba(26,20,35,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 180);
  });
}
