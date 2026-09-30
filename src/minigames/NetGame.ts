// 21장 디베랴 바닷가: 배 오른편에 던진 그물이 무거워 끌어올리기 힘들다. 사람들과 함께 그물을 당긴다.
// 확인 버튼을 누를 때마다 당기고, 올라온 물고기를 센다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { MiniGame } from './MiniGame.ts';

const FISH = 153;

export class NetGame extends MiniGame {
  readonly title = '그물 끌어올리기';
  readonly howTo = '그물에 고기가 가득해 무겁다. 확인 버튼이나 화면을 계속 눌러 그물을 당기자. 올라오는 고기를 세어 보자.';

  private count = 0;
  private net!: Phaser.GameObjects.Graphics;
  private pull = 0;
  private playing = false;
  private boatY = 0;

  constructor() {
    super('Net');
  }

  protected build() {
    const { W, H } = this;
    this.count = 0;
    this.pull = 0;
    this.playing = false;
    this.cameras.main.setBackgroundColor(PAL.rose);
    this.add.rectangle(0, H * 0.18, W, 10, PAL.honey).setOrigin(0);
    const sea = this.add.tileSprite(0, H * 0.25, W, H, 'water').setOrigin(0);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 3000, repeat: -1 });
    this.boatY = Math.floor(H * 0.42);
    this.add.image(W * 0.4, this.boatY, 'boat').setScale(2);
    ['player', 'crowd1', 'crowd4'].forEach((k, i) => this.add.sprite(W * 0.28 + i * 18, this.boatY - 14, k, 8));
    this.net = this.add.graphics();
    this.drawNet();
  }

  private drawNet() {
    const { W, H } = this;
    const depth = (1 - this.pull) * H * 0.45;
    const x = W * 0.72;
    const y = this.boatY;
    this.net.clear();
    this.net.lineStyle(1, PAL.khaki, 1);
    for (let i = 0; i <= 5; i++) this.net.lineBetween(x - 10 + i * 6, y, x - 16 + i * 8, y + depth + 10);
    for (let j = 0; j <= 4; j++) this.net.lineBetween(x - 10 - j, y + (depth * j) / 4, x + 22 + j, y + (depth * j) / 4);
    this.net.fillStyle(PAL.steel);
    const n = Math.min(24, Math.round(this.count / 6));
    for (let i = 0; i < n; i++) this.net.fillRect(x - 12 + ((i * 7) % 34), y + depth - ((i * 5) % 12), 3, 2);
  }

  protected begin() {
    this.playing = true;
    this.setStatus(`고기 0마리`);
    const pull = () => {
      if (!this.playing) return;
      this.pull = Math.min(1, this.pull + 0.025);
      this.count = Math.min(FISH, this.count + Phaser.Math.Between(2, 5));
      Sfx.tick();
      this.cameras.main.shake(60, 0.002);
      this.setStatus(`고기 ${this.count}마리`);
      this.drawNet();
      if (this.count >= FISH) {
        this.playing = false;
        this.complete();
      }
    };
    this.input.on('pointerdown', pull);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') && pull());
  }
}
