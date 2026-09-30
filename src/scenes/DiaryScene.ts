import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { DIARY } from '../diary/index.ts';
import { Save } from '../state/save.ts';
import { showDiaryPage } from '../ui/DiaryPage.ts';
import { choose, say } from '../ui/Dialog.ts';

/** 일기장 메뉴: 지금까지 쓴 일기를 다시 읽는다. */
export class DiaryScene extends Phaser.Scene {
  constructor() {
    super('Diary');
  }

  async create() {
    this.cameras.main.setBackgroundColor(PAL.bark);
    const entries = [...Save.data.diary].sort((a, b) => a.ch - b.ch);
    if (entries.length === 0) {
      await say(this, null, '아직 쓴 일기가 없다.');
      return this.scene.start('Title');
    }
    for (;;) {
      const options = [...entries.map((e) => `${e.ch}장 · ${DIARY[e.ch].title}`), '돌아가기'];
      const pick = await choose(this, '일기장', options);
      if (pick === entries.length) return this.scene.start('Title');
      await showDiaryPage(this, entries[pick], { typing: false, closeLabel: '닫기' });
    }
  }
}
