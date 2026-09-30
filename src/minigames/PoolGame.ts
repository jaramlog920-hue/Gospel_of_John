// 5장 베데스다: 물이 움직일 때 누운 사람을 도와 먼저 넣어 주려 하지만, 매번 다른 사람이 먼저 들어간다.
// 이길 수 없는 게임이다. 실패를 이야기로 풀어내고(설계 문서 4장), 표적은 이어지는 본문으로 본다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { say } from '../ui/Dialog.ts';
import { MiniGame } from './MiniGame.ts';

const TRIES = 3;

export class PoolGame extends MiniGame {
  readonly title = '물이 움직일 때';
  readonly howTo = '못의 물이 움직이면 곁에 누운 사람을 부축해 물가로 가자. 물결이 일면 확인 버튼이나 화면을 누른다.';

  private water!: Phaser.GameObjects.TileSprite;
  private stirring = false;
  private tries = 0;
  private waiting = false;
  private man!: Phaser.GameObjects.Image;
  private player!: Phaser.GameObjects.Sprite;
  private others: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super('Pool');
  }

  protected build() {
    const { W, H } = this;
    this.tries = 0;
    this.stirring = false;
    this.waiting = false;
    this.others = [];
    this.cameras.main.setBackgroundColor(PAL.mist);
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) rt.batchDraw('paving', x, y);
    rt.endDraw();
    for (let x = 12; x < W; x += 32) this.add.image(x, Math.floor(H * 0.22), 'pillar').setOrigin(0.5, 1).setScale(0.6);
    const py = Math.floor(H * 0.3);
    this.add.rectangle(10, py, W - 20, Math.floor(H * 0.3), PAL.khaki).setOrigin(0);
    this.water = this.add.tileSprite(14, py + 4, W - 28, Math.floor(H * 0.3) - 8, 'water').setOrigin(0);
    this.man = this.add.image(W * 0.35, H * 0.78, 'sitter6').setAngle(90);
    this.player = this.add.sprite(W * 0.35 + 18, H * 0.78, 'player', 4);
    for (let i = 0; i < 3; i++) {
      const s = this.add.sprite(W * (0.55 + i * 0.13), py + Math.floor(H * 0.3) + 12, `crowd${i + 2}`, 4);
      this.others.push(s);
    }
  }

  protected begin() {
    this.setStatus(`물이 움직인 때 0/${TRIES}`);
    this.input.on('pointerdown', () => this.help());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') && this.help());
    this.nextStir();
  }

  private nextStir() {
    this.time.delayedCall(Phaser.Math.Between(1800, 3200), () => {
      this.stirring = true;
      Sfx.splash();
      this.tweens.add({ targets: this.water, alpha: 0.6, duration: 120, yoyo: true, repeat: 5 });
      // 늘 누군가 먼저 뛰어든다.
      const o = this.others[this.tries % this.others.length];
      this.tweens.add({ targets: o, y: this.water.y + 10, duration: 350, delay: 250, onComplete: () => this.afterStir(o) });
    });
  }

  private help() {
    if (!this.stirring || this.waiting || this.finished) return;
    this.waiting = true;
    this.tweens.add({ targets: [this.player, this.man], y: '-=10', duration: 500 });
  }

  private async afterStir(o: Phaser.GameObjects.Sprite) {
    this.stirring = false;
    this.tries++;
    this.setStatus(`물이 움직인 때 ${this.tries}/${TRIES}`);
    Sfx.miss();
    this.tweens.add({ targets: o, alpha: 0, duration: 400 });
    this.tweens.add({ targets: [this.player, this.man], y: this.H * 0.78, duration: 500 });
    this.waiting = false;
    if (this.tries < TRIES) return this.nextStir();
    this.controls.busy = true;
    await say(this, '나', '세 번이나 물이 움직였는데, 그때마다 누군가 먼저 들어갔다. 그 사람은 이렇게 오래 기다려 왔구나.');
    this.complete();
  }
}
