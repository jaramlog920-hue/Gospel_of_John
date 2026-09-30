// 게임 텍스트 대화 상자와 선택지. 두루마리(본문)와 모양을 달리해서 구분한다(설계 원칙 2).
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { drawPanel, nextArrow } from './panel.ts';
import { bt, DEPTH_UI, measurer } from './text.ts';
import { wrapWords } from './wrap.ts';

const PAD = 8;
const LINE = 13;
const LINES = 3;
const BOX_H = PAD * 2 + LINE * LINES - 2;
const CHAR_DELAY = 22;

/** 대화 상자 위치: 화면 아래, 넓은 화면에서는 가운데 400px */
function boxRect(scene: Phaser.Scene) {
  const w = Math.min(scene.scale.width, 400) - 12;
  return { x: Math.floor((scene.scale.width - w) / 2), y: scene.scale.height - BOX_H - 6, w, h: BOX_H };
}

/**
 * 말하는 사람 이름과 게임 텍스트. 여러 문장은 차례로 보여준다.
 * 글자가 한 자씩 나오고, 누르면 끝까지 한 번에 나온 뒤 ▼가 깜빡이면 다음으로 넘어간다.
 */
export function say(scene: Phaser.Scene, speaker: string | null, ...messages: string[]): Promise<void> {
  const measure = measurer('ui');
  const r = boxRect(scene);
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 5);
  root.add(drawPanel(scene.add.graphics(), r.x, r.y, r.w, r.h, 'dark'));
  if (speaker) {
    const nw = measure(speaker) + 12;
    root.add(drawPanel(scene.add.graphics(), r.x + 6, r.y - 9, nw, 14, 'accent'));
    root.add(bt(scene, r.x + 12, r.y - 9, speaker, PAL.white));
  }
  const body = bt(scene, r.x + PAD, r.y + PAD - 2, '', PAL.white).setLineSpacing(LINE - 12);
  const arrow = nextArrow(scene, r.x + r.w - 14, r.y + r.h - 9).setVisible(false);
  root.add([body, arrow]);

  // 페이지 = 최대 3줄
  const pages: string[][] = [];
  for (const msg of messages) {
    const lines = wrapWords(msg, r.w - PAD * 2 - 8, measure);
    for (let i = 0; i < lines.length; i += LINES) pages.push(lines.slice(i, i + LINES));
  }

  return new Promise((resolve) => {
    let page = 0;
    let shown = 0;
    let full = '';
    let timer: Phaser.Time.TimerEvent | null = null;
    const finishTyping = () => {
      timer?.remove();
      timer = null;
      body.setText(full);
      arrow.setVisible(true);
    };
    const show = () => {
      full = pages[page].join('\n');
      const chars = [...full];
      shown = 0;
      arrow.setVisible(false);
      timer = scene.time.addEvent({
        delay: CHAR_DELAY,
        loop: true,
        callback: () => {
          shown++;
          body.setText(chars.slice(0, shown).join(''));
          if (shown >= chars.length) finishTyping();
        },
      });
    };
    const advance = () => {
      if (timer) return finishTyping();
      page++;
      if (page < pages.length) return show();
      scene.input.off('pointerdown', advance);
      scene.input.keyboard?.off('keydown', onKey);
      root.destroy();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') && advance();
    show();
    scene.time.delayedCall(150, () => {
      scene.input.on('pointerdown', advance);
      scene.input.keyboard?.on('keydown', onKey);
    });
  });
}

/** 선택지. 정답·벌점 없음(설계 원칙 7). 고른 번호를 돌려준다. 줄 높이를 넉넉히 해 손가락으로 누르기 쉽게 한다. */
export function choose(scene: Phaser.Scene, prompt: string | null, options: string[]): Promise<number> {
  const measure = measurer('ui');
  const rowH = 20;
  const { width: W, height: H } = scene.scale;
  const w = Math.min(W - 16, Math.max(120, ...options.map((o) => measure(o) + 40), prompt ? measure(prompt) + 24 : 0));
  const top = prompt ? 22 : 6;
  const h = top + options.length * rowH + 6;
  const x = Math.round((W - w) / 2);
  const y = Math.round((H - h) / 2);
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 6);
  root.add(scene.add.rectangle(0, 0, W, H, PAL.ink, 0.35).setOrigin(0));
  root.add(drawPanel(scene.add.graphics(), x, y, w, h, 'dark', 0.97));
  if (prompt) {
    root.add(bt(scene, x + 10, y + 6, prompt, PAL.honey));
    root.add(scene.add.rectangle(x + 8, y + 18, w - 16, 1, PAL.indigo).setOrigin(0));
  }
  const bar = scene.add.rectangle(x + 4, 0, w - 8, rowH - 4, PAL.indigo).setOrigin(0);
  const cursor = scene.add.triangle(0, 0, 0, 0, 0, 6, 4, 3, PAL.gold).setOrigin(0);
  root.add([bar, cursor]);
  const rows = options.map((o, i) => {
    const ry = y + top + i * rowH;
    const label = bt(scene, x + 20, ry + 3, o, PAL.mist);
    const hit = scene.add.zone(x, ry, w, rowH).setOrigin(0).setInteractive({ useHandCursor: true });
    root.add([label, hit]);
    return { label, hit, ry };
  });
  let sel = 0;
  const place = () => {
    const r = rows[sel];
    bar.setY(r.ry + 2);
    cursor.setPosition(x + 10, r.ry + 6);
    rows.forEach((row, i) => row.label.setTint(i === sel ? PAL.white : PAL.steel));
  };
  place();

  return new Promise((resolve) => {
    const finish = (i: number) => {
      scene.input.keyboard?.off('keydown', onKey);
      sel = i;
      place();
      // 고른 줄을 잠깐 반짝여서 눌렸다는 것을 보여 준다.
      scene.tweens.add({
        targets: bar,
        alpha: 0.3,
        duration: 60,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          root.destroy();
          resolve(i);
        },
      });
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
        r.hit.on('pointerover', () => ((sel = i), place()));
        r.hit.on('pointerdown', () => finish(i));
      });
    });
  });
}

/** 화면 가운데 장 제목 카드 */
export async function titleCard(scene: Phaser.Scene, title: string, sub: string) {
  const { width: W, height: H } = scene.scale;
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 20);
  root.add(scene.add.rectangle(0, 0, W, H, PAL.ink).setOrigin(0));
  const t = bt(scene, W / 2, H / 2 - 14, title, PAL.honey, 'body').setOrigin(0.5);
  // 제목 아래 줄: 가운데에서 양옆으로 펼쳐진다(폭 대신 가로 배율을 늘려야 가운데를 기준으로 커진다).
  const line = scene.add.rectangle(W / 2, H / 2, Math.min(160, W - 40), 1, PAL.rust).setScale(0, 1);
  const s = bt(scene, W / 2, H / 2 + 14, sub, PAL.steel).setOrigin(0.5);
  root.add([t, line, s]);
  root.setAlpha(0);
  await new Promise<void>((r) => scene.tweens.add({ targets: root, alpha: 1, duration: 400, onComplete: () => r() }));
  await new Promise<void>((r) => scene.tweens.add({ targets: line, scaleX: 1, duration: 500, ease: 'Cubic.Out', onComplete: () => r() }));
  await new Promise<void>((r) => scene.time.delayedCall(1000, () => r()));
  await new Promise<void>((r) => scene.tweens.add({ targets: root, alpha: 0, duration: 500, onComplete: () => r() }));
  root.destroy();
}
