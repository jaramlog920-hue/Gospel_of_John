// 말씀 두루마리. 성경 본문은 이 프레임 안에서만 그린다(설계 원칙 2).
// 줄바꿈은 띄어쓰기에서만, 넘치면 다음 페이지로 넘긴다. 글자는 한 자씩 나타나고 누르면 건너뛴다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { scrollLayout } from './layout.ts';
import { drawPanel, nextArrow } from './panel.ts';
import { bt, DEPTH_UI, measurer } from './text.ts';
import { paginate, wrapWords } from './wrap.ts';

interface Line {
  ref: string;
  verseNum?: number;
  text: string;
}

const CHAR_DELAY = 28;

export function openScroll(scene: Phaser.Scene, refs: string[]): Promise<void> {
  const SCROLL = scrollLayout(scene.scale.width, scene.scale.height);
  const measure = measurer('body');
  const lines: Line[] = [];
  for (const ref of refs) {
    for (const verse of Scripture.resolve(ref)) {
      wrapWords(verse.text, SCROLL.textWidth, measure).forEach((text, i) =>
        lines.push({ ref, verseNum: i === 0 ? verse.v : undefined, text }),
      );
    }
  }
  const pages = paginate(lines, SCROLL.linesPerPage);
  // 본문이 짧으면 두루마리도 짧게, 화면 가운데에 둔다.
  const rows = Math.max(3, ...pages.map((p) => p.length));
  SCROLL.height = Math.min(SCROLL.height, SCROLL.padTop + rows * SCROLL.lineHeight + 18);
  SCROLL.y = Math.floor((scene.scale.height - SCROLL.height) / 2);

  const depth = DEPTH_UI + 10;
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
  const dim = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, PAL.ink, 0.55).setOrigin(0);
  const g = scene.add.graphics();
  drawParchment(g, SCROLL);
  const header = bt(scene, SCROLL.x + SCROLL.padX, SCROLL.y + 7, '', PAL.rust);
  const pageInfo = bt(scene, SCROLL.x + SCROLL.width - SCROLL.padX, SCROLL.y + 7, '', PAL.clay).setOrigin(1, 0);
  const arrow = nextArrow(scene, SCROLL.x + SCROLL.width - 18, SCROLL.y + SCROLL.height - 12, PAL.rust).setVisible(false);
  root.add([dim, g, header, pageInfo, arrow]);
  root.setAlpha(0);
  scene.tweens.add({ targets: root, alpha: 1, duration: 180 });

  let pageObjs: Phaser.GameObjects.BitmapText[] = [];

  return new Promise((resolve) => {
    let page = 0;
    let typing: Phaser.Time.TimerEvent | null = null;
    let finishTyping: (() => void) | null = null;

    const showPage = () => {
      pageObjs.forEach((o) => o.destroy());
      pageObjs = [];
      arrow.setVisible(false);
      const lines = pages[page];
      const refsOnPage = [...new Set(lines.map((l) => l.ref))];
      header.setText(refsOnPage.map((r) => Scripture.label(r)).join(' · '));
      pageInfo.setText(pages.length > 1 ? `${page + 1}/${pages.length}` : '');

      const bodies: Phaser.GameObjects.BitmapText[] = [];
      lines.forEach((line, i) => {
        const y = SCROLL.y + SCROLL.padTop + i * SCROLL.lineHeight;
        if (line.verseNum !== undefined) {
          // 절 번호는 위첨자처럼 작고 붉게
          const num = bt(scene, SCROLL.x + SCROLL.padX, y - 1, String(line.verseNum), PAL.berry);
          pageObjs.push(num);
          root.add(num);
        }
        const body = bt(scene, SCROLL.x + SCROLL.padX + SCROLL.verseNumWidth, y - 3, '', PAL.ink, 'body');
        pageObjs.push(body);
        bodies.push(body);
        root.add(body);
      });

      // 한 자씩 나타내기. 표시되는 글자는 언제나 원문의 앞부분이다.
      let li = 0;
      let ci = 0;
      finishTyping = () => {
        typing?.remove();
        typing = null;
        lines.forEach((l, i) => bodies[i].setText(l.text));
        arrow.setVisible(true);
        finishTyping = null;
      };
      typing = scene.time.addEvent({
        delay: CHAR_DELAY,
        loop: true,
        callback: () => {
          const chars = [...lines[li].text];
          ci++;
          bodies[li].setText(chars.slice(0, ci).join(''));
          if (ci >= chars.length) {
            li++;
            ci = 0;
            if (li >= lines.length) finishTyping?.();
          }
        },
      });
    };

    const advance = () => {
      if (finishTyping) {
        finishTyping();
        return;
      }
      page++;
      if (page < pages.length) {
        showPage();
        return;
      }
      cleanup();
      scene.tweens.add({
        targets: root,
        alpha: 0,
        duration: 160,
        onComplete: () => {
          root.destroy();
          resolve();
        },
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') advance();
    };
    const cleanup = () => {
      scene.input.off('pointerdown', advance);
      scene.input.keyboard?.off('keydown', onKey);
    };

    showPage();
    scene.time.delayedCall(150, () => {
      scene.input.on('pointerdown', advance);
      scene.input.keyboard?.on('keydown', onKey);
    });
  });
}

function drawParchment(g: Phaser.GameObjects.Graphics, SCROLL: ReturnType<typeof scrollLayout>) {
  const { x, y, width: w, height: h } = SCROLL;
  drawPanel(g, x, y + 1, w, h - 2, 'paper');
  // 두루마리 막대(위·아래)와 금빛 손잡이
  for (const ry of [y - 2, y + h - 3]) {
    g.fillStyle(PAL.ink).fillRect(x - 5, ry - 1, w + 10, 7);
    g.fillStyle(PAL.clay).fillRect(x - 4, ry, w + 8, 5);
    g.fillStyle(PAL.tan).fillRect(x - 4, ry, w + 8, 1);
    g.fillStyle(PAL.rust).fillRect(x - 4, ry + 4, w + 8, 1);
    for (const hx of [x - 9, x + w + 5]) {
      g.fillStyle(PAL.ink).fillRect(hx - 1, ry - 2, 6, 9);
      g.fillStyle(PAL.gold).fillRect(hx, ry - 1, 4, 7);
      g.fillStyle(PAL.orange).fillRect(hx + 2, ry - 1, 2, 7);
    }
  }
  // 종이 결
  g.fillStyle(PAL.peach);
  for (let i = 0; i < 16; i++) g.fillRect(x + 6 + ((i * 53) % (w - 12)), y + 10 + ((i * 29) % (h - 20)), 2, 1);
  g.fillStyle(PAL.peach).fillRect(x + SCROLL.padX, y + 20, w - SCROLL.padX * 2, 1);
}
