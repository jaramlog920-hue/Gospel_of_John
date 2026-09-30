// 일기장 한 쪽. 게임 텍스트라서 두루마리와 다른 모양(줄 공책)으로 그린다(설계 원칙 2).
// 아래에 그날 받은 본문 참조가 붙어 있고, 누르면 두루마리가 열린다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { DIARY, diaryText } from '../diary/index.ts';
import type { DiaryRecord } from '../state/save.ts';
import { EMOTIONS } from '../state/types.ts';
import { drawPanel } from './panel.ts';
import { openScroll } from './ScrollFrame.ts';
import { bt, DEPTH_UI, measurer, Tag } from './text.ts';
import { wrapWords } from './wrap.ts';

const LINE = 14;

export function showDiaryPage(scene: Phaser.Scene, rec: DiaryRecord, opts: { typing: boolean; closeLabel: string }): Promise<void> {
  const d = DIARY[rec.ch];
  const measure = measurer('ui');
  const { width: W, height: H } = scene.scale;
  const pw = Math.min(W - 16, 280);
  const lines = wrapWords(diaryText(rec.ch, rec.emotion, rec.flags), pw - 32, measure);
  const ph = Math.min(H - 16, 40 + lines.length * LINE + 34);
  const P = { x: Math.floor((W - pw) / 2), y: Math.floor((H - ph) / 2), w: pw, h: ph, pad: 16 };
  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 8);

  root.add(scene.add.rectangle(0, 0, W, H, PAL.ink, 0.55).setOrigin(0));
  const g = drawPanel(scene.add.graphics(), P.x, P.y, P.w, P.h, 'light');
  // 줄 공책: 파란 가로줄과 분홍 여백선, 위쪽 제본 구멍
  g.fillStyle(PAL.skyLight);
  for (let i = 0; i < lines.length; i++) g.fillRect(P.x + 6, P.y + 40 + i * LINE + 12, P.w - 12, 1);
  g.fillStyle(PAL.rose).fillRect(P.x + 11, P.y + 2, 1, P.h - 4);
  g.fillStyle(PAL.mist);
  for (let hx = P.x + 24; hx < P.x + P.w - 12; hx += 22) g.fillRect(hx, P.y + 4, 3, 3);
  root.add(g);

  const emotion = EMOTIONS.find((e) => e.key === rec.emotion)!.label;
  root.add(bt(scene, P.x + P.pad, P.y + 12, `${rec.ch}장 · ${d.title}`, PAL.ink, 'body'));
  root.add(new Tag(scene, P.x + P.w - P.pad + 4, P.y + 12, emotion, { fg: PAL.white, bg: PAL.berry, originX: 1, padX: 4, padY: 2 }));
  const bodies = lines.map((_, i) => bt(scene, P.x + P.pad, P.y + 40 + i * LINE - 1, '', PAL.night));
  root.add(bodies);

  // 본문 참조 칩(누르면 두루마리) + 닫기 버튼
  let cx = P.x + P.pad;
  const chipY = P.y + P.h - 22;
  const chips = d.refs.map((ref) => {
    const chip = new Tag(scene, cx, chipY, `두루마리 ${Scripture.label(ref)}`, { fg: PAL.ink, bg: PAL.cream, border: PAL.rust, padY: 4 });
    cx += chip.boxWidth + 6;
    return { chip, ref };
  });
  root.add(chips.map((c) => c.chip));
  const close = new Tag(scene, P.x + P.w - P.pad + 4, chipY, opts.closeLabel, { fg: PAL.white, bg: PAL.teal, border: PAL.ink, originX: 1, padX: 8, padY: 4 });
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
      delay: 40,
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
