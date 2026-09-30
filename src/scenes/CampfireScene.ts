// 표적 스테이지가 끝난 밤. 주인공의 마음을 고르면 모닥불 앞에서 일기가 한 자씩 써진다.
// 정답과 벌점은 없다(설계 원칙 7).
import Phaser from 'phaser';
import { PAL, rgb } from '../art/palette.ts';
import { Save } from '../state/save.ts';
import { EMOTIONS } from '../state/types.ts';
import { showDiaryPage } from '../ui/DiaryPage.ts';
import { choose, say } from '../ui/Dialog.ts';

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
    const { width: W, height: H } = this.scale;
    const shore = Math.floor(H * 0.47);
    const fireY = Math.floor(H * 0.7);
    this.cameras.main.setBackgroundColor(PAL.night).fadeIn(700);
    for (let i = 0; i < 30; i++) this.add.rectangle((i * 97) % W, (i * 41) % (shore - 16), 1, 1, PAL.white, 0.8);
    const sea = this.add.tileSprite(0, shore - 16, W, 16, 'water').setOrigin(0).setTint(PAL.navy);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 5000, repeat: -1 });
    for (let y = shore; y < H; y += 16) for (let x = 0; x < W; x += 16) this.add.image(x, y, 'sand').setOrigin(0).setTint(PAL.lilac);
    const glow = this.add.image(W / 2, fireY - 4, 'halo').setScale(2.4).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setTint(PAL.orange);
    this.tweens.add({ targets: glow, alpha: 0.4, scale: 2.3, duration: 600, yoyo: true, repeat: -1 });
    this.add.sprite(W / 2, fireY, 'campfire').play('campfire-burn');
    this.add.sprite(W / 2 - 24, fireY - 4, 'player', 8); // 옆모습으로 불을 바라본다

    await say(this, '나', '모닥불 앞에 앉았다. 오늘 본 것들이 자꾸 떠오른다.');
    const pick = await choose(
      this,
      '오늘 내 마음은?',
      EMOTIONS.map((e) => e.label),
    );
    const rec = { ch, emotion: EMOTIONS[pick].key, flags };
    Save.recordDiary(rec);
    await showDiaryPage(this, rec, { typing: true, closeLabel: '다음 ▶' });
    this.cameras.main.fadeOut(600, ...rgb(PAL.ink));
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
  }
}
