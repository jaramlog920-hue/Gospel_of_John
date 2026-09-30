// "일곱 표적" 화면. 본 표적만 이름이 드러나고(★), 아직 못 본 표적은 가려 둔다(☆ ???).
// 표적 본문을 처음 다 읽는 순간 알림을 띄운다. 게임을 하며 하나씩 열어 가는 수집 요소다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { SIGNS } from '../story/signs.ts';
import { choose, say } from './Dialog.ts';
import { openScroll } from './ScrollFrame.ts';
import { DEPTH_UI, Tag } from './text.ts';

const ORDINAL = ['첫', '두', '세', '네', '다섯', '여섯', '일곱'];

/** 표적 본문의 모든 절을 읽었으면 본 것으로 친다. */
export function signSeen(ref: string) {
  const read = new Set(Save.data.verses.flatMap((r) => Scripture.resolve(r).map((v) => `${v.ch}:${v.v}`)));
  return Scripture.resolve(ref).every((v) => read.has(`${v.ch}:${v.v}`));
}

export async function showSigns(scene: Phaser.Scene) {
  for (;;) {
    const count = SIGNS.filter((s) => signSeen(s.ref)).length;
    const options = [...SIGNS.map((s) => (signSeen(s.ref) ? `★ ${s.n}. ${s.name}` : `☆ ${s.n}. ???`)), '돌아가기'];
    const pick = await choose(scene, `일곱 표적 ${count}/7`, options);
    if (pick === SIGNS.length) return;
    const s = SIGNS[pick];
    if (signSeen(s.ref)) await openScroll(scene, [s.ref]);
    else await say(scene, null, '아직 보지 못한 표적이다. 이야기를 따라가다 보면 만나게 된다.');
  }
}

/** 두루마리를 읽은 뒤 불러서, 이번에 처음 다 본 표적이 있으면 알린다. 알린 개수를 돌려준다. */
export function announceNewSigns(scene: Phaser.Scene): number {
  const fresh = SIGNS.filter((s) => signSeen(s.ref) && !Save.data.flags[`sign${s.n}`]);
  fresh.forEach((s, i) => {
    Save.setFlag(`sign${s.n}`, true);
    const count = SIGNS.filter((x) => Save.data.flags[`sign${x.n}`]).length;
    scene.time.delayedCall(i * 2600, () => {
      Sfx.done();
      const tag = new Tag(scene, scene.scale.width / 2, 28, `${ORDINAL[s.n - 1]} 번째 표적을 보았다 · ${count}/7\n${s.name}`, {
        fg: PAL.white,
        bg: PAL.berry,
        border: PAL.ink,
        originX: 0.5,
        padX: 8,
        padY: 5,
      })
        .setScrollFactor(0)
        .setDepth(DEPTH_UI + 40)
        .setAlpha(0);
      scene.tweens.add({ targets: tag, alpha: 1, y: 22, duration: 300 });
      scene.time.delayedCall(2200, () => scene.tweens.add({ targets: tag, alpha: 0, duration: 400, onComplete: () => tag.destroy() }));
    });
  });
  return fresh.length;
}
