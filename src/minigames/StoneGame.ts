// 11장 베다니: 사람들과 함께 무덤 앞의 큰 돌을 옆으로 굴린다. 확인 버튼(또는 화면)을 박자에 맞춰 누른다.
import Phaser from 'phaser';
import { WORLD as WC } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { MiniGame } from './MiniGame.ts';

export class StoneGame extends MiniGame {
  readonly title = '돌을 옮기자';
  readonly howTo = '사람들과 함께 무덤 앞의 큰 돌을 굴린다. 확인 버튼이나 화면을 계속 눌러 힘을 모으자. 손을 놓으면 돌이 조금씩 되돌아온다.';

  private stone!: Phaser.GameObjects.Image;
  private helpers: Phaser.GameObjects.Sprite[] = [];
  private force = 0;
  private startX = 0;
  private playing = false;

  constructor() {
    super('Stone');
  }

  protected build() {
    const { W, H } = this;
    this.helpers = [];
    this.force = 0;
    this.playing = false;
    this.cameras.main.setBackgroundColor(WC.skyDay[0]);
    const ground = Math.floor(H * 0.7);
    this.add.rectangle(0, ground, W, H, WC.dust).setOrigin(0);
    this.add.image(W / 2, ground + 4, 'tomb').setOrigin(0.5, 1).setScale(2);
    this.startX = W / 2 - 12;
    this.stone = this.add.image(this.startX, ground + 4, 'stone-round').setOrigin(0.5, 1).setScale(2);
    ['player', 'crowd1', 'crowd4'].forEach((k, i) => {
      const s = this.add.sprite(this.startX - 30 - i * 14, ground + 2, k, 8).setOrigin(0.5, 1);
      this.helpers.push(s);
    });
  }

  protected begin() {
    this.playing = true;
    this.setStatus('힘을 모으자');
    const push = () => {
      if (!this.playing) return;
      this.force += 7;
      Sfx.step();
      this.helpers.forEach((h) => this.tweens.add({ targets: h, x: h.x + 1, duration: 60, yoyo: true }));
    };
    this.input.on('pointerdown', push);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') && push());
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const dt = delta / 1000;
    this.force = Math.max(0, this.force - 18 * dt);
    const moved = Math.min(60, this.force);
    this.stone.x = this.startX + moved;
    this.stone.angle = moved * 3;
    this.helpers.forEach((h, i) => (h.x = this.stone.x - 30 - i * 14));
    this.setStatus(`돌 ${Math.round((moved / 60) * 100)}%`);
    if (moved >= 60) {
      this.playing = false;
      this.cameras.main.shake(300, 0.006);
      this.complete();
    }
  }
}
