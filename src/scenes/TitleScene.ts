import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { choose } from '../ui/Dialog.ts';
import { FONT_SCRIPTURE, FONT_UI, GAME_WIDTH, SIZE_SCRIPTURE } from '../ui/layout.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { waitPress } from '../ui/text.ts';

// 타이틀 두루마리 구절. 본문에는 "와 보라"로 되어 있다(data/SOURCE.md).
const TITLE_REF = 'john:4:28-29';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  async create() {
    this.cameras.main.setBackgroundColor(PAL.night);
    // 밤바다
    for (let x = 0; x < GAME_WIDTH; x += 16) {
      this.add.image(x, 148, 'water').setOrigin(0);
      this.add.image(x, 164, 'water').setOrigin(0);
    }
    for (let i = 0; i < 40; i++) {
      const star = this.add.rectangle((i * 83) % GAME_WIDTH, (i * 37) % 110, 1, 1, PAL.mist);
      this.tweens.add({ targets: star, alpha: 0.2, duration: 800 + (i % 5) * 300, yoyo: true, repeat: -1 });
    }
    this.add.image(GAME_WIDTH / 2, 52, 'halo').setScale(2.2).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);

    this.add
      .text(GAME_WIDTH / 2, 30, '일곱 표적', { fontFamily: FONT_SCRIPTURE, fontSize: `${SIZE_SCRIPTURE * 2}px`, color: css(PAL.gold) })
      .setOrigin(0.5)
      .setShadow(2, 2, css(PAL.wine), 0);
    this.add.text(GAME_WIDTH / 2, 56, '와서 보라', { fontFamily: FONT_SCRIPTURE, fontSize: `${SIZE_SCRIPTURE}px`, color: css(PAL.white) }).setOrigin(0.5);

    // 작은 두루마리: 참조 표기만 보여주고, 누르면 본문 원문이 열린다.
    const tag = this.add
      .text(GAME_WIDTH / 2, 76, `두루마리 펼치기 · ${Scripture.label(TITLE_REF)}`, {
        fontFamily: FONT_UI,
        fontSize: '10px',
        color: css(PAL.ink),
        backgroundColor: css(PAL.parchment),
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const prompt = this.add.text(GAME_WIDTH / 2, 118, '터치하여 시작', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.mist) }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    let scrollOpen = false;
    tag.on('pointerdown', async (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      if (scrollOpen) return;
      scrollOpen = true;
      await openScroll(this, [TITLE_REF]);
      scrollOpen = false;
    });

    // 첫 터치 뒤에 오디오를 켤 수 있다(브라우저 정책).
    do await waitPress(this);
    while (scrollOpen);
    prompt.destroy();
    tag.disableInteractive();

    const hasSave = Save.load(1) !== null && Save.data.chaptersDone.length > 0;
    const options = hasSave ? ['이어하기', '처음부터', '일기장'] : ['시작하기'];
    const pick = options[await choose(this, null, options)];
    if (pick === '일기장') return this.scene.start('Diary');
    if (pick === '이어하기') return this.scene.start(Save.data.chaptersDone.includes(1) ? 'Ch6' : 'Ch1');
    Save.startNew(1);
    this.scene.start('Ch1');
  }
}
