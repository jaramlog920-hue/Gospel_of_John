// 표적 스테이지가 끝난 밤. 주인공의 마음을 고르면 모닥불 앞에서 일기가 한 자씩 써진다.
// 정답과 벌점은 없다(설계 원칙 7).
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Save } from '../state/save.ts';
import { EMOTIONS } from '../state/types.ts';
import { showDiaryPage } from '../ui/DiaryPage.ts';
import { choose, say } from '../ui/Dialog.ts';
import { GAME_WIDTH } from '../ui/layout.ts';

interface CampfireData {
  ch: number;
  next: string;
  flags: Record<string, boolean>;
}

export class CampfireScene extends Phaser.Scene {
  constructor() {
    super('Campfire');
  }

  async create(data: CampfireData) {
    const { ch = 6, next = 'End', flags = {} } = data ?? {};
    this.cameras.main.setBackgroundColor(PAL.night).fadeIn(700);
    for (let i = 0; i < 30; i++) this.add.rectangle((i * 97) % GAME_WIDTH, (i * 41) % 70, 1, 1, PAL.mist, 0.8);
    for (let x = 0; x < GAME_WIDTH; x += 16) this.add.image(x, 84, 'water').setOrigin(0).setAlpha(0.6);
    for (let y = 100; y < 180; y += 16) for (let x = 0; x < GAME_WIDTH; x += 16) this.add.image(x, y, 'sand').setOrigin(0).setTint(0x8a7fa0);
    const glow = this.add.image(160, 128, 'halo').setScale(2.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setTint(0xffb070);
    this.tweens.add({ targets: glow, alpha: 0.4, scale: 2.3, duration: 600, yoyo: true, repeat: -1 });
    this.add.sprite(160, 132, 'campfire').play('campfire-burn');
    this.add.sprite(136, 128, 'player', 0);

    await say(this, '나', '모닥불 앞에 앉았다. 오늘 본 것들이 자꾸 떠오른다.');
    const pick = await choose(
      this,
      '오늘 내 마음은?',
      EMOTIONS.map((e) => e.label),
    );
    const rec = { ch, emotion: EMOTIONS[pick].key, flags };
    Save.recordDiary(rec);
    await showDiaryPage(this, rec, { typing: true, closeLabel: '다음 ▶' });
    this.cameras.main.fadeOut(600, 26, 20, 35);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
  }
}
