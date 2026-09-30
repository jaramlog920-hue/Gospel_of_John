import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { choose } from '../ui/Dialog.ts';
import { FONT_UI } from '../ui/layout.ts';

/** M1 프로토타입 끝 화면 */
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  async create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(PAL.ink).fadeIn(600);
    // 겹치는 참조가 있어도 절은 한 번만 센다.
    const verses = new Set(Save.data.verses.flatMap((ref) => Scripture.resolve(ref).map((v) => `${v.ch}:${v.v}`))).size;
    this.add.text(W / 2, H * 0.22, '프로토타입은 여기까지입니다', { fontFamily: 'Galmuri11', fontSize: '12px', color: css(PAL.gold) }).setOrigin(0.5);
    this.add
      .text(W / 2, H * 0.22 + 22, `모은 말씀 ${verses} / ${Scripture.count}절`, { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.mist) })
      .setOrigin(0.5);
    const pick = await choose(this, null, ['일기장 보기', '처음으로']);
    this.scene.start(pick === 0 ? 'Diary' : 'Title');
  }
}
