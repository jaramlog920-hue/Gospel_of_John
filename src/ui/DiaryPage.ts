// 일기장 한 쪽. 게임 텍스트라서 두루마리와 다른 모양(줄 공책)으로 그린다(설계 원칙 2).
// 아래에 그날 받은 본문 참조가 붙어 있고, 누르면 두루마리가 열린다.
import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { DIARY, diaryText } from '../diary/index.ts';
import type { DiaryRecord } from '../state/save.ts';
import { EMOTIONS } from '../state/types.ts';
import { FONT_UI, GAME_HEIGHT, GAME_WIDTH, SIZE_UI } from './layout.ts';
import { openScroll } from './ScrollFrame.ts';
import { DEPTH_UI, measurer } from './text.ts';
import { wrapWords } from './wrap.ts';

const PAGE = { x: 30, y: 12, w: 260, h: 156, pad: 14, line: 14 };

export function showDiaryPage(scene: Phaser.Scene, rec: DiaryRecord, opts: { typing: boolean; closeLabel: string }): Promise<void> {
  const d = DIARY[rec.ch];
  const measure = measurer(FONT_UI, SIZE_UI);
  const lines = wrapWords(diaryText(rec.ch, rec.emotion, rec.flags), PAGE.w - PAGE.pad * 2, measure);
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 8);

  const g = scene.add.graphics();
  g.fillStyle(PAL.ink, 0.5).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  g.fillStyle(PAL.bark).fillRect(PAGE.x - 3, PAGE.y - 3, PAGE.w + 6, PAGE.h + 6);
  g.fillStyle(PAL.white).fillRect(PAGE.x, PAGE.y, PAGE.w, PAGE.h);
  g.fillStyle(PAL.sky, 0.6);
  for (let y = PAGE.y + 34; y < PAGE.y + PAGE.h - 30; y += PAGE.line) g.fillRect(PAGE.x + 6, y + 11, PAGE.w - 12, 1);
  g.fillStyle(PAL.rose).fillRect(PAGE.x + 10, PAGE.y, 1, PAGE.h);
  root.add(g);

  const emotion = EMOTIONS.find((e) => e.key === rec.emotion)!.label;
  root.add(scene.add.text(PAGE.x + PAGE.pad, PAGE.y + 8, `${rec.ch}장 · ${d.title}`, { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.ink) }));
  root.add(
    scene.add.text(PAGE.x + PAGE.w - PAGE.pad, PAGE.y + 8, `오늘의 마음: ${emotion}`, { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.wine) }).setOrigin(1, 0),
  );
  const bodies = lines.map((_, i) =>
    scene.add.text(PAGE.x + PAGE.pad, PAGE.y + 34 + i * PAGE.line, '', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.night) }),
  );
  root.add(bodies);

  // 본문 참조 칩
  let cx = PAGE.x + PAGE.pad;
  const chips = d.refs.map((ref) => {
    const chip = scene.add
      .text(cx, PAGE.y + PAGE.h - 22, Scripture.label(ref), {
        fontFamily: FONT_UI,
        fontSize: '10px',
        color: css(PAL.ink),
        backgroundColor: css(PAL.parchment),
        padding: { x: 4, y: 2 },
      })
      .setInteractive({ useHandCursor: true });
    cx += chip.width + 6;
    return { chip, ref };
  });
  root.add(chips.map((c) => c.chip));
  const close = scene.add
    .text(PAGE.x + PAGE.w - PAGE.pad, PAGE.y + PAGE.h - 22, opts.closeLabel, {
      fontFamily: FONT_UI,
      fontSize: '10px',
      color: css(PAL.white),
      backgroundColor: css(PAL.teal),
      padding: { x: 5, y: 2 },
    })
    .setOrigin(1, 0)
    .setInteractive({ useHandCursor: true });
  root.add(close);

  let scrollOpen = false;
  let typingDone = !opts.typing;
  const finishTyping = () => {
    typingDone = true;
    lines.forEach((l, i) => bodies[i].setText(l));
  };
  if (opts.typing) {
    let li = 0;
    let ci = 0;
    const ev = scene.time.addEvent({
      delay: 45,
      loop: true,
      callback: () => {
        if (typingDone) return ev.remove();
        const chars = [...lines[li]];
        bodies[li].setText(chars.slice(0, ++ci).join(''));
        if (ci >= chars.length) {
          li++;
          ci = 0;
          if (li >= lines.length) finishTyping();
        }
      },
    });
  } else finishTyping();

  return new Promise((resolve) => {
    for (const { chip, ref } of chips) {
      chip.on('pointerdown', async (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        if (scrollOpen) return;
        finishTyping();
        scrollOpen = true;
        await openScroll(scene, [ref]);
        scrollOpen = false;
      });
    }
    const done = () => {
      if (scrollOpen) return;
      if (!typingDone) return finishTyping();
      scene.input.off('pointerdown', skip);
      scene.input.keyboard?.off('keydown', onKey);
      root.destroy();
      resolve();
    };
    const skip = () => !scrollOpen && !typingDone && finishTyping();
    const onKey = (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') && done();
    close.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      done();
    });
    scene.time.delayedCall(150, () => {
      scene.input.on('pointerdown', skip);
      scene.input.keyboard?.on('keydown', onKey);
    });
  });
}
