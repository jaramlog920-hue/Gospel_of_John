// 말씀 두루마리. 성경 본문은 이 프레임 안에서만 그린다(설계 원칙 2).
// 줄바꿈은 띄어쓰기에서만, 넘치면 다음 페이지로 넘긴다. 글자는 한 자씩 나타나고 누르면 건너뛴다.
import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { FONT_SCRIPTURE, FONT_UI, SCROLL, SCROLL_TEXT_WIDTH, SIZE_SCRIPTURE, SIZE_UI } from './layout.ts';
import { DEPTH_UI, measurer } from './text.ts';
import { paginate, wrapWords } from './wrap.ts';

interface Line {
  ref: string;
  verseNum?: number;
  text: string;
}

const CHAR_DELAY = 28;

export function openScroll(scene: Phaser.Scene, refs: string[]): Promise<void> {
  const measure = measurer(FONT_SCRIPTURE, SIZE_SCRIPTURE);
  const lines: Line[] = [];
  for (const ref of refs) {
    for (const verse of Scripture.resolve(ref)) {
      wrapWords(verse.text, SCROLL_TEXT_WIDTH, measure).forEach((text, i) =>
        lines.push({ ref, verseNum: i === 0 ? verse.v : undefined, text }),
      );
    }
  }
  const pages = paginate(lines, SCROLL.linesPerPage);

  const depth = DEPTH_UI + 10;
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
  const dim = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, PAL.ink, 0.55).setOrigin(0);
  const g = scene.add.graphics();
  drawParchment(g);
  const header = scene.add.text(SCROLL.x + SCROLL.padX, SCROLL.y + 7, '', {
    fontFamily: FONT_UI,
    fontSize: `${SIZE_UI}px`,
    color: css(PAL.scrollEdge),
  });
  const pageInfo = scene.add
    .text(SCROLL.x + SCROLL.width - SCROLL.padX, SCROLL.y + 7, '', { fontFamily: FONT_UI, fontSize: `${SIZE_UI}px`, color: css(PAL.scrollEdge) })
    .setOrigin(1, 0);
  const arrow = scene.add.triangle(SCROLL.x + SCROLL.width - 16, SCROLL.y + SCROLL.height - 10, 0, 0, 7, 0, 3.5, 4, PAL.scrollEdge).setVisible(false);
  root.add([dim, g, header, pageInfo, arrow]);
  root.setAlpha(0);
  scene.tweens.add({ targets: root, alpha: 1, duration: 180 });
  const blink = scene.tweens.add({ targets: arrow, y: '+=2', duration: 400, yoyo: true, repeat: -1 });

  let pageObjs: Phaser.GameObjects.Text[] = [];

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

      const bodies: Phaser.GameObjects.Text[] = [];
      lines.forEach((line, i) => {
        const y = SCROLL.y + SCROLL.padTop + i * SCROLL.lineHeight;
        if (line.verseNum !== undefined) {
          // 절 번호는 위첨자처럼 작게
          const num = scene.add.text(SCROLL.x + SCROLL.padX, y - 1, String(line.verseNum), {
            fontFamily: FONT_UI,
            fontSize: `${SIZE_UI}px`,
            color: css(PAL.ember),
          });
          pageObjs.push(num);
          root.add(num);
        }
        const body = scene.add.text(SCROLL.x + SCROLL.padX + SCROLL.verseNumWidth, y, '', {
          fontFamily: FONT_SCRIPTURE,
          fontSize: `${SIZE_SCRIPTURE}px`,
          color: css(PAL.ink),
        });
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
          blink.remove();
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

function drawParchment(g: Phaser.GameObjects.Graphics) {
  const { x, y, width: w, height: h } = SCROLL;
  // 두루마리 막대
  g.fillStyle(PAL.wood).fillRect(x - 4, y - 3, w + 8, 5);
  g.fillStyle(PAL.wood).fillRect(x - 4, y + h - 2, w + 8, 5);
  g.fillStyle(PAL.gold).fillRect(x - 6, y - 4, 3, 7).fillRect(x + w + 3, y - 4, 3, 7);
  g.fillStyle(PAL.gold).fillRect(x - 6, y + h - 3, 3, 7).fillRect(x + w + 3, y + h - 3, 3, 7);
  // 양피지
  g.fillStyle(PAL.parchmentDark).fillRect(x, y + 2, w, h - 4);
  g.fillStyle(PAL.parchment).fillRect(x + 2, y + 3, w - 4, h - 6);
  g.fillStyle(PAL.parchmentDark);
  for (let i = 0; i < 18; i++) g.fillRect(x + 6 + ((i * 53) % (w - 12)), y + 8 + ((i * 29) % (h - 16)), 1, 1);
  g.lineStyle(1, PAL.parchmentDark).lineBetween(x + SCROLL.padX, y + 19, x + w - SCROLL.padX, y + 19);
}
