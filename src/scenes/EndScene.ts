import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { choose } from '../ui/Dialog.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { bt } from '../ui/text.ts';

/** 마지막 화면: 요한복음을 끝까지 읽었다. */
export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  async create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(PAL.ink).fadeIn(900);
    for (let i = 0; i < 40; i++) this.add.rectangle((i * 83) % W, (i * 37) % H, 1, 1, PAL.white, 0.6);
    // 겹치는 참조가 있어도 절은 한 번만 센다.
    const verses = new Set(Save.data.verses.flatMap((ref) => Scripture.resolve(ref).map((v) => `${v.ch}:${v.v}`))).size;
    bt(this, W / 2, H * 0.2, '요한복음을 끝까지 읽었습니다', PAL.honey, 'body').setOrigin(0.5);
    bt(this, W / 2, H * 0.2 + 20, `모은 말씀 ${verses} / ${Scripture.count}절`, PAL.steel).setOrigin(0.5);
    bt(this, W / 2, H * 0.2 + 34, `쓴 일기 ${Save.data.diary.length}편`, PAL.steel).setOrigin(0.5);

    for (;;) {
      const pick = await choose(this, null, ['마지막 두 절 다시 읽기', '일기장 보기', '처음으로']);
      if (pick === 0) await openScroll(this, ['john:20:30-31']);
      else if (pick === 1) return this.scene.start('Diary');
      else return this.scene.start('Title');
    }
  }
}
