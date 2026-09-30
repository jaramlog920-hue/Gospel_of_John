import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { choose } from '../ui/Dialog.ts';
import { FONT_SCRIPTURE, FONT_UI, SIZE_SCRIPTURE } from '../ui/layout.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { waitPress } from '../ui/text.ts';

// 타이틀 두루마리 구절. 본문에는 "와 보라"로 되어 있다(data/SOURCE.md).
const TITLE_REF = 'john:4:28-29';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  async create() {
    const { width: W, height: H } = this.scale;
    const cy = Math.floor(H * 0.4);
    this.cameras.main.setBackgroundColor(PAL.night);
    // 해 질 녘 바다
    const seaTop = H - 32;
    const sky = this.add.graphics();
    sky.fillGradientStyle(PAL.night, PAL.night, PAL.wine, PAL.wine, 1).fillRect(0, 0, W, seaTop);
    for (let x = 0; x < W; x += 16) {
      this.add.image(x, seaTop, 'water').setOrigin(0);
      this.add.image(x, seaTop + 16, 'water').setOrigin(0);
    }
    for (let i = 0; i < 40; i++) {
      const star = this.add.rectangle((i * 83) % W, (i * 37) % Math.floor(H * 0.55), 1, 1, PAL.white);
      this.tweens.add({ targets: star, alpha: 0.2, duration: 800 + (i % 5) * 300, yoyo: true, repeat: -1 });
    }
    this.add.image(W / 2, cy - 18, 'halo').setScale(2.2).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);

    this.add
      .text(W / 2, cy - 38, '일곱 표적', { fontFamily: FONT_SCRIPTURE, fontSize: `${SIZE_SCRIPTURE * 2}px`, color: css(PAL.gold) })
      .setOrigin(0.5)
      .setShadow(2, 2, css(PAL.ink), 0);
    this.add.text(W / 2, cy - 12, '와서 보라', { fontFamily: FONT_SCRIPTURE, fontSize: `${SIZE_SCRIPTURE}px`, color: css(PAL.white) }).setOrigin(0.5);

    // 작은 두루마리: 참조 표기만 보여주고, 누르면 본문 원문이 열린다.
    const tag = this.add
      .text(W / 2, cy + 10, `두루마리 펼치기 · ${Scripture.label(TITLE_REF)}`, {
        fontFamily: FONT_UI,
        fontSize: '10px',
        color: css(PAL.ink),
        backgroundColor: css(PAL.parchment),
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const prompt = this.add.text(W / 2, cy + 44, '터치하여 시작', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.white) }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

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
