// 게임 텍스트 말풍선과 선택지. 두루마리와 다른 모양(아래쪽 상자)으로 본문과 구분한다(설계 원칙 2).
import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { FONT_UI, SIZE_UI } from './layout.ts';
import { DEPTH_UI, measurer, waitPress } from './text.ts';
import { wrapWords } from './wrap.ts';

const BOX = { x: 8, h: 50, pad: 8, lineHeight: 12 };

function boxY(scene: Phaser.Scene) {
  return scene.scale.height - BOX.h - 6;
}

function drawBox(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
  g.fillStyle(PAL.ink, 0.92).fillRoundedRect(x, y, w, h, 4);
  g.lineStyle(1, PAL.mist).strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 4);
}

/** 말하는 사람 이름과 한 줄 이상의 게임 텍스트. 여러 문장은 차례로 보여준다. */
export async function say(scene: Phaser.Scene, speaker: string | null, ...messages: string[]) {
  const measure = measurer(FONT_UI, SIZE_UI);
  const width = Math.min(scene.scale.width, 400) - BOX.x * 2;
  const bx = Math.floor((scene.scale.width - width) / 2);
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 5);
  const g = scene.add.graphics();
  drawBox(g, bx, boxY(scene), width, BOX.h);
  root.add(g);
  if (speaker) {
    const nameW = measure(speaker) + 10;
    const ng = scene.add.graphics();
    ng.fillStyle(PAL.teal).fillRoundedRect(bx + 6, boxY(scene) - 8, nameW, 13, 3);
    root.add([ng, scene.add.text(bx + 11, boxY(scene) - 7, speaker, { fontFamily: FONT_UI, fontSize: `${SIZE_UI}px`, color: css(PAL.white) })]);
  }
  const body = scene.add.text(bx + BOX.pad, boxY(scene) + BOX.pad, '', {
    fontFamily: FONT_UI,
    fontSize: `${SIZE_UI}px`,
    color: css(PAL.white),
    lineSpacing: 2,
  });
  root.add(body);
  for (const msg of messages) {
    const lines = wrapWords(msg, width - BOX.pad * 2, measure);
    for (let i = 0; i < lines.length; i += 3) {
      body.setText(lines.slice(i, i + 3).join('\n'));
      await waitPress(scene);
    }
  }
  root.destroy();
}

/** 선택지. 정답·벌점 없음(설계 원칙 7). 고른 번호를 돌려준다. */
export function choose(scene: Phaser.Scene, prompt: string | null, options: string[]): Promise<number> {
  const measure = measurer(FONT_UI, SIZE_UI);
  const rowH = 15;
  const w = Math.max(...options.map((o) => measure(o)), prompt ? measure(prompt) : 0) + 34;
  const h = options.length * rowH + (prompt ? rowH + 4 : 0) + 10;
  const x = Math.round((scene.scale.width - w) / 2);
  const y = Math.round((scene.scale.height - h) / 2);
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 6);
  const g = scene.add.graphics();
  drawBox(g, x, y, w, h);
  root.add(g);
  let oy = y + 6;
  if (prompt) {
    root.add(scene.add.text(x + 10, oy, prompt, { fontFamily: FONT_UI, fontSize: `${SIZE_UI}px`, color: css(PAL.gold) }));
    oy += rowH + 4;
  }
  const cursor = scene.add.triangle(0, 0, 0, 0, 0, 6, 4, 3, PAL.gold).setOrigin(0);
  root.add(cursor);
  const rows = options.map((o, i) => {
    const t = scene.add
      .text(x + 18, oy + i * rowH, o, { fontFamily: FONT_UI, fontSize: `${SIZE_UI}px`, color: css(PAL.white) })
      .setInteractive(new Phaser.Geom.Rectangle(-12, -2, w - 12, rowH), Phaser.Geom.Rectangle.Contains);
    root.add(t);
    return t;
  });
  let sel = 0;
  const place = () => {
    cursor.setPosition(x + 9, oy + sel * rowH + 3);
    rows.forEach((r, i) => r.setColor(css(i === sel ? PAL.gold : PAL.white)));
  };
  place();

  return new Promise((resolve) => {
    const finish = (i: number) => {
      scene.input.keyboard?.off('keydown', onKey);
      root.destroy();
      resolve(i);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') sel = (sel + options.length - 1) % options.length;
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') sel = (sel + 1) % options.length;
      else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') return finish(sel);
      place();
    };
    scene.time.delayedCall(150, () => {
      scene.input.keyboard?.on('keydown', onKey);
      rows.forEach((r, i) => {
        r.on('pointerover', () => ((sel = i), place()));
        r.on('pointerdown', () => finish(i));
      });
    });
  });
}

/** 화면 가운데 짧은 제목 카드 */
export async function titleCard(scene: Phaser.Scene, title: string, sub: string) {
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 20);
  const { width: W, height: H } = scene.scale;
  root.add(scene.add.rectangle(0, 0, W, H, PAL.ink).setOrigin(0));
  root.add(scene.add.text(W / 2, H / 2 - 12, title, { fontFamily: 'Galmuri11', fontSize: '12px', color: css(PAL.gold) }).setOrigin(0.5));
  root.add(scene.add.text(W / 2, H / 2 + 8, sub, { fontFamily: FONT_UI, fontSize: `${SIZE_UI}px`, color: css(PAL.mist) }).setOrigin(0.5));
  root.setAlpha(0);
  await new Promise<void>((r) => scene.tweens.add({ targets: root, alpha: 1, duration: 400, onComplete: () => r() }));
  await new Promise<void>((r) => scene.time.delayedCall(1400, () => r()));
  await new Promise<void>((r) => scene.tweens.add({ targets: root, alpha: 0, duration: 500, onComplete: () => r() }));
  root.destroy();
}
