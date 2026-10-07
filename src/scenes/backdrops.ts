// 이야기 장면의 배경. 장소마다 하늘·먼 풍경·바닥·소품을 그린다(1세기 유대·갈릴리 고증, 설계 원칙 8).
import Phaser from 'phaser';
import { PAL, WORLD } from '../art/palette.ts';
import { grassTile } from '../art/textures.ts';
import type { Setting } from '../story/stories.ts';

export interface Stage {
  scene: Phaser.Scene;
  W: number;
  H: number;
  worldW: number;
  groundTop: number;
  yMin: number;
  yMax: number;
  ch: number;
  /** 밤에 빛나는 곳(등잔·숯불) */
  lights: { x: number; y: number; r: number }[];
  /** 바위 무덤의 막음돌(있으면) */
  tombStone?: Phaser.GameObjects.Image;
  /** 걷는 구역 세로 위치(0 위 ~ 1 아래) */
  yAt(f: number): number;
}

type Sky = 'day' | 'noon' | 'evening' | 'night' | 'dawn' | 'overcast';
const SKIES: Record<Sky, readonly number[]> = {
  day: WORLD.skyDay,
  noon: WORLD.skyNoon,
  evening: WORLD.skyEvening,
  night: WORLD.skyNight,
  dawn: WORLD.skyDawn,
  overcast: WORLD.skyOvercast,
};

interface SettingDef {
  sky: Sky | ((ch: number) => Sky);
  ground: string | ((x: number, y: number) => string);
  night?: boolean | ((ch: number) => boolean);
  /** 수평선 쪽 풍경과 소품 */
  build(st: Stage): void;
  /** 오가는 사람 수 */
  crowd?: number;
}

// ───────── 공통 그리기 도구 ─────────

function sky(st: Stage, kind: Sky) {
  const g = st.scene.add.graphics().setScrollFactor(0).setDepth(-100);
  const colors = SKIES[kind];
  const bandH = Math.ceil(st.groundTop / colors.length);
  colors.forEach((c, i) => g.fillStyle(c).fillRect(0, i * bandH, st.W, bandH + 1));
  colors.forEach((c, i) => {
    if (i === 0) return;
    g.fillStyle(c);
    for (let x = (i % 2) * 2; x < st.W; x += 4) g.fillRect(x, i * bandH - 1, 2, 1);
  });
  if (kind === 'night') {
    for (let i = 0; i < 46; i++) g.fillStyle(i % 5 ? PAL.mist : PAL.white).fillRect((i * 83) % st.W, (i * 37) % Math.max(10, st.groundTop - 20), 1, 1);
    g.fillStyle(PAL.cream).fillCircle(st.W - 30, 18, 6);
  }
}

function hills(st: Stage, color: number, rim: number, height: number, factor = 0.5) {
  const g = st.scene.add.graphics().setScrollFactor(factor, 1).setDepth(-90);
  for (let x = 0; x < st.worldW; x += 2) {
    const h = Math.round(height + Math.sin(x / 70) * 5 + Math.sin(x / 23) * 2);
    g.fillStyle(color).fillRect(x, st.groundTop - h, 2, h + 1);
    g.fillStyle(rim).fillRect(x, st.groundTop - h, 2, 1);
  }
}

function water(st: Stage, y: number, h: number, tint?: number) {
  const t = st.scene.add.tileSprite(0, y, st.worldW, h, 'water').setOrigin(0).setDepth(-80);
  if (tint !== undefined) t.setTint(tint);
  st.scene.tweens.add({ targets: t, tilePositionX: 32, duration: 4000, repeat: -1 });
  return t;
}

function ground(st: Stage, tile: string | ((x: number, y: number) => string)) {
  const rt = st.scene.add.renderTexture(0, st.groundTop, st.worldW, st.H - st.groundTop).setOrigin(0).setDepth(-70);
  rt.beginDraw();
  for (let y = st.groundTop; y < st.H; y += 16)
    for (let x = 0; x < st.worldW; x += 16) rt.batchDraw(typeof tile === 'string' ? tile : tile(x, y), x, y - st.groundTop);
  rt.endDraw();
}

/** 수평선에 뒤를 대고 선 소품(집·기둥·나무) */
function row(st: Stage, key: string, from: number, gap: number, opts: { y?: number; scale?: number; tint?: number; jitter?: number } = {}) {
  for (let x = from; x < st.worldW; x += gap) {
    const j = opts.jitter ? ((x * 37) % opts.jitter) - opts.jitter / 2 : 0;
    const img = st.scene.add.image(x + j, opts.y ?? st.groundTop + 2, key).setOrigin(0.5, 1).setDepth(-60);
    if (opts.scale) img.setScale(opts.scale);
    if (opts.tint !== undefined) img.setTint(opts.tint);
  }
}

/** 걷는 구역 안의 소품(깊이 정렬) */
function prop(st: Stage, key: string, x: number, f: number, flip = false) {
  const y = st.yAt(f);
  return st.scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y).setFlipX(flip);
}

function lamp(st: Stage, x: number, y: number) {
  st.scene.add.image(x, y, 'lamp-on').setDepth(y);
  st.lights.push({ x, y: y - 4, r: 1.4 });
}

function charcoalFire(st: Stage, x: number, f: number) {
  const y = st.yAt(f);
  st.scene.add.sprite(x, y, 'campfire').setOrigin(0.5, 1).setDepth(y).play('campfire-burn');
  st.lights.push({ x, y: y - 8, r: 2.6 });
}

/** 멀리 보이는 성벽(석회암) */
function cityWall(st: Stage, factor = 0.6) {
  const g = st.scene.add.graphics().setScrollFactor(factor, 1).setDepth(-85);
  const top = st.groundTop - 26;
  g.fillStyle(WORLD.wall).fillRect(0, top, st.worldW, 26);
  g.fillStyle(WORLD.wallTop).fillRect(0, top, st.worldW, 2);
  for (let x = 0; x < st.worldW; x += 12) g.fillStyle(WORLD.wall).fillRect(x, top - 4, 7, 4);
  g.fillStyle(WORLD.wallLine);
  for (let y = top + 6; y < st.groundTop; y += 6) for (let x = (y % 12) * 2; x < st.worldW; x += 18) g.fillRect(x, y, 10, 1);
}

/** 실내: 회칠한 벽과 작은 창 */
function interiorWall(st: Stage) {
  const g = st.scene.add.graphics().setScrollFactor(0).setDepth(-100);
  g.fillStyle(WORLD.plaster).fillRect(0, 0, st.W, st.groundTop);
  g.fillStyle(WORLD.plasterLine).fillRect(0, st.groundTop - 4, st.W, 4);
  g.fillStyle(WORLD.wallTop);
  for (let i = 0; i < 12; i++) g.fillRect((i * 53) % st.W, (i * 29) % Math.max(8, st.groundTop - 8), 2, 1);
  const beams = st.scene.add.graphics().setDepth(-95);
  for (let x = 20; x < st.worldW; x += 70) {
    beams.fillStyle(PAL.ink).fillRect(x, st.groundTop - 34, 12, 12);
    beams.fillStyle(PAL.dusk).fillRect(x + 1, st.groundTop - 33, 10, 10);
  }
}

// ───────── 장소별 ─────────

export const SETTINGS: Record<Setting, SettingDef> = {
  jordan: {
    sky: 'day',
    ground: 'wild',
    crowd: 4,
    build(st) {
      hills(st, WORLD.hillSlate, WORLD.hillSlateRim, 16, 0.4);
      water(st, st.groundTop - 10, 10);
      row(st, 'reeds', 20, 46, { jitter: 20 });
      for (let x = 90; x < st.worldW; x += 190) prop(st, 'bush', x, 0.9);
    },
  },
  village: {
    sky: 'day',
    ground: 'dirt',
    crowd: 5,
    build(st) {
      hills(st, WORLD.hillSage, WORLD.hillSageRim, 14, 0.4);
      row(st, 'house', 30, 88, { jitter: 16 });
      row(st, 'tree', 75, 176);
      if (st.ch === 2) for (let i = 0; i < 6; i++) prop(st, 'jar', 150 + i * 10, 0.05);
    },
  },
  temple: {
    sky: 'day',
    ground: 'paving',
    crowd: 8,
    build(st) {
      cityWall(st, 0.5);
      row(st, 'pillar', 16, 40);
    },
  },
  night: {
    sky: 'night',
    ground: 'paving',
    night: true,
    build(st) {
      row(st, 'house-lime', 20, 70);
      for (let x = 60; x < st.worldW; x += 140) lamp(st, x, st.groundTop - 2);
    },
  },
  well: {
    sky: 'noon',
    ground: 'wild',
    build(st) {
      hills(st, WORLD.hillSlate, WORLD.hillSlateRim, 30, 0.3); // 그리심 산
      hills(st, WORLD.hillSage, WORLD.hillSageRim, 10, 0.5);
      prop(st, 'well', Math.round(st.worldW * 0.35), 0.35);
      row(st, 'tree', 50, 150);
    },
  },
  pool: {
    sky: 'day',
    ground: 'paving',
    build(st) {
      cityWall(st, 0.5);
      row(st, 'pillar', 16, 36);
      // 못: 계단으로 내려가는 물
      const g = st.scene.add.graphics().setDepth(st.yAt(0.55) - 20);
      const px = 60;
      const pw = st.worldW - 120;
      const py = st.yAt(0.58);
      g.fillStyle(WORLD.wallLine).fillRect(px - 4, py - 4, pw + 8, 26);
      g.fillStyle(WORLD.wallTop).fillRect(px - 2, py - 2, pw + 4, 22);
      water(st, py, 18).setDepth(py - 19).setX(px).setSize(pw, 18);
      for (let x = px + 10; x < px + pw; x += 34) st.scene.add.image(x, py - 6, `sitter${(x / 34) % 8 | 0}`).setDepth(py - 6);
    },
  },
  lake: {
    sky: 'night',
    ground: 'deck',
    night: true,
    build(st) {
      water(st, st.groundTop - 20, 20, PAL.indigo);
      row(st, 'boat', 30, 120, { y: st.groundTop - 2 });
      // 배가 흔들린다
      st.scene.tweens.add({ targets: st.scene.cameras.main, y: 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      lamp(st, 40, st.yAt(0.1));
    },
  },
  synagogue: {
    sky: 'day',
    ground: 'basalt',
    crowd: 6,
    build(st) {
      hills(st, WORLD.hillSage, WORLD.hillSageRim, 12, 0.4);
      row(st, 'house', 40, 60); // 가버나움의 현무암 집들
    },
  },
  siloam: {
    sky: 'day',
    ground: 'paving',
    crowd: 3,
    build(st) {
      cityWall(st, 0.5);
      const py = st.yAt(0.62);
      const g = st.scene.add.graphics().setDepth(py - 20);
      for (let i = 0; i < 4; i++) g.fillStyle(i % 2 ? WORLD.wallLine : WORLD.wallTop).fillRect(0, py - 12 + i * 3, st.worldW, 3);
      water(st, py, 14).setDepth(py - 19);
    },
  },
  pasture: {
    sky: 'evening',
    ground: grassTile,
    build(st) {
      hills(st, WORLD.hillSage, WORLD.hillSageRim, 12, 0.4);
      for (let x = 40; x < st.worldW; x += 16) st.scene.add.image(x, st.yAt(0.05), 'stonewall').setOrigin(0.5, 1).setDepth(st.yAt(0.05));
      for (let i = 0; i < 14; i++) {
        const s = prop(st, 'sheep', 50 + ((i * 97) % (st.worldW - 100)), 0.2 + ((i * 37) % 60) / 100, i % 2 === 0);
        st.scene.tweens.add({ targets: s, x: s.x + (i % 2 ? 6 : -6), duration: 2000 + i * 200, yoyo: true, repeat: -1 });
      }
    },
  },
  bethany: {
    sky: 'day',
    ground: 'dirt',
    crowd: 4,
    build(st) {
      hills(st, WORLD.hillSlate, WORLD.hillSlateRim, 26, 0.35);
      row(st, 'house-lime', 20, 110);
      row(st, 'tree', 70, 160);
      // 바위 무덤과 막음돌(마지막 두루마리 곁)
      const tx = st.worldW - 70;
      st.scene.add.image(tx, st.groundTop + 4, 'tomb').setOrigin(0.5, 1).setDepth(st.groundTop);
      st.tombStone = st.scene.add.image(tx - 5, st.groundTop + 3, 'stone-round').setOrigin(0.5, 1).setDepth(st.groundTop + 1);
    },
  },
  road: {
    sky: 'day',
    ground: 'dirt',
    crowd: 12,
    build(st) {
      cityWall(st, 0.35);
      row(st, 'palm', 30, 70, { jitter: 20 });
    },
  },
  upper: {
    sky: 'night',
    ground: 'floor',
    night: true,
    build(st) {
      interiorWall(st);
      const cy = st.yAt(0.45);
      for (let x = 80; x < st.worldW - 40; x += 200) {
        st.scene.add.image(x, cy, 'table').setDepth(cy);
        for (const dx of [-26, 26]) st.scene.add.image(x + dx, cy + 6, 'cushion').setDepth(cy + 1);
        lamp(st, x, cy - 6);
      }
      prop(st, 'jar', 30, 0.1);
    },
  },
  vineyard: {
    sky: 'night',
    ground: 'dirt',
    night: true,
    build(st) {
      hills(st, WORLD.hillDusk, WORLD.hillDuskRim, 14, 0.4);
      row(st, 'vine', 8, 16, { y: st.groundTop + 4 });
      row(st, 'tree', 100, 220);
    },
  },
  garden: {
    sky: 'night',
    ground: grassTile,
    night: true,
    build(st) {
      hills(st, WORLD.hillDusk, WORLD.hillDuskRim, 20, 0.4);
      row(st, 'tree', 20, 60, { jitter: 24 });
      for (let x = 80; x < st.worldW; x += 130) prop(st, 'tree', x, 0.95);
      lamp(st, st.worldW - 50, st.yAt(0.3)); // 다가오는 등불
    },
  },
  courtyard: {
    sky: 'night',
    ground: 'paving',
    night: true,
    build(st) {
      row(st, 'house-lime', 20, 64);
      charcoalFire(st, Math.round(st.worldW * 0.45), 0.45);
      for (const dx of [-24, 24, -12]) st.scene.add.image(st.worldW * 0.45 + dx, st.yAt(0.45) + (dx === -12 ? 8 : 0), `sitter${Math.abs(dx) % 8}`).setDepth(st.yAt(0.45) + 1);
    },
  },
  praetorium: {
    sky: 'overcast',
    ground: 'paving',
    build(st) {
      cityWall(st, 0.5);
      row(st, 'pillar', 24, 48);
    },
  },
  golgotha: {
    sky: 'overcast',
    ground: 'wild',
    build(st) {
      cityWall(st, 0.2);
      hills(st, WORLD.hillDusk, WORLD.hillDuskRim, 30, 0.35);
      // 멀리 언덕 위, 작고 어둡게(원칙 6)
      st.scene.add.image(st.worldW * 0.5 * 0.35 + st.W * 0.4, st.groundTop - 34, 'crosses').setScrollFactor(0.35, 1).setDepth(-88).setAlpha(0.85);
    },
  },
  tomb: {
    sky: (ch) => (ch === 20 ? 'dawn' : 'evening'),
    ground: grassTile,
    build(st) {
      hills(st, WORLD.hillSage, WORLD.hillSageRim, 22, 0.4);
      row(st, 'tree', 30, 90, { jitter: 20 });
      const tx = st.worldW - 70;
      st.scene.add.image(tx, st.groundTop + 4, 'tomb').setOrigin(0.5, 1).setDepth(st.groundTop);
      // 막음돌은 입구 옆에 있다. 19장에서는 장례 뒤에 입구를 막고, 20장에서는 이미 옮겨져 있다.
      st.tombStone = st.scene.add
        .image(tx + 22, st.groundTop + 3, 'stone-round')
        .setOrigin(0.5, 1)
        .setDepth(st.groundTop + 1);
    },
  },
  room: {
    sky: 'night',
    ground: 'floor',
    night: true,
    build(st) {
      interiorWall(st);
      for (let x = 60; x < st.worldW; x += 160) lamp(st, x, st.yAt(0.1));
      for (let x = 90; x < st.worldW; x += 120) st.scene.add.image(x, st.yAt(0.35), `sitter${(x / 120) % 8 | 0}`).setDepth(st.yAt(0.35));
    },
  },
  shore: {
    sky: 'dawn',
    ground: 'sand',
    build(st) {
      water(st, st.groundTop - 24, 24);
      st.scene.add.image(80, st.groundTop - 6, 'boat').setOrigin(0.5, 1).setDepth(-75);
      charcoalFire(st, st.worldW - 90, 0.35);
      st.scene.add.image(st.worldW - 76, st.yAt(0.35) - 4, 'fish').setDepth(st.yAt(0.35) + 1);
      st.scene.add.image(st.worldW - 104, st.yAt(0.35) - 4, 'bread').setDepth(st.yAt(0.35) + 1);
    },
  },
};

/** 배경 전체를 그린다. */
export function buildBackdrop(st: Stage, setting: Setting) {
  const def = SETTINGS[setting];
  const skyKind = typeof def.sky === 'function' ? def.sky(st.ch) : def.sky;
  if (setting !== 'upper' && setting !== 'room') sky(st, skyKind);
  ground(st, def.ground);
  def.build(st);
  // 오가는 사람들(가상 인물, 말하지 않음)
  for (let i = 0; i < (def.crowd ?? 0); i++) {
    const key = `crowd${i % 6}`;
    const x = 60 + ((i * 131) % Math.max(60, st.worldW - 120));
    const s = st.scene.add.sprite(x, st.yAt(((i * 53) % 80) / 100 + 0.05), key, 8);
    s.setDepth(s.y).play(`${key}-walk-side`);
    s.anims.setProgress((i % 4) / 4);
    st.scene.tweens.add({
      targets: s,
      x: `+=${80 + (i % 3) * 30}`,
      duration: 6000 + i * 500,
      yoyo: true,
      repeat: -1,
      onYoyo: () => s.setFlipX(true),
      onRepeat: () => s.setFlipX(false),
    });
  }
  return { night: typeof def.night === 'function' ? def.night(st.ch) : !!def.night };
}
