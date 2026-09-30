// "일곱 표적" 화면: 본 표적에는 ★, 누르면 그 표적의 본문 두루마리를 연다.
import Phaser from 'phaser';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { SIGNS } from '../story/signs.ts';
import { choose, say } from './Dialog.ts';
import { openScroll } from './ScrollFrame.ts';

/** 표적 본문의 모든 절을 읽었으면 본 것으로 친다. */
function seen(ref: string) {
  const read = new Set(Save.data.verses.flatMap((r) => Scripture.resolve(r).map((v) => `${v.ch}:${v.v}`)));
  return Scripture.resolve(ref).every((v) => read.has(`${v.ch}:${v.v}`));
}

export async function showSigns(scene: Phaser.Scene) {
  for (;;) {
    const count = SIGNS.filter((s) => seen(s.ref)).length;
    const options = [...SIGNS.map((s) => `${seen(s.ref) ? '★' : '☆'} ${s.n}. ${s.name}`), '돌아가기'];
    const pick = await choose(scene, `일곱 표적 ${count}/7`, options);
    if (pick === SIGNS.length) return;
    const s = SIGNS[pick];
    if (seen(s.ref)) await openScroll(scene, [s.ref]);
    else await say(scene, null, `아직 보지 못한 표적이다. ${s.ch}장에서 보게 된다.`);
  }
}
