// 2장 가나: 돌항아리 여섯 개에 물을 아귀까지 채운다. 물통의 수위가 오르내릴 때 맨 위에서 부으면 된다.
// 주인공은 하인들 곁에서 물 긷기를 돕는다. 표적은 다 채운 뒤 연출로만 보여준다(설계 원칙 5).
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { bt } from '../ui/text.ts';
import { MiniGame } from './MiniGame.ts';

const JARS = 6;

export class JarsGame extends MiniGame {
  readonly title = '돌항아리 채우기';
  readonly howTo = '물통의 물이 오르내린다. 물이 맨 위 금빛 칸에 닿았을 때 확인 버튼(또는 화면)을 누르면 항아리에 붓는다. 여섯 항아리를 아귀까지 채우자.';

  private level = 0;
  private dir = 1;
  private speed = 0.9;
  private filled = 0;
  private waters: Phaser.GameObjects.Rectangle[] = [];
  private jars: Phaser.GameObjects.Image[] = [];
  private meter!: Phaser.GameObjects.Rectangle;
  private meterX = 0;
  private meterTop = 0;
  private meterH = 60;
  private playing = false;

  constructor() {
    super('Jars');
  }

  protected build() {
    const { W, H } = this;
    this.level = 0;
    this.dir = 1;
    this.speed = 0.9;
    this.filled = 0;
    this.waters = [];
    this.jars = [];
    this.playing = false;
    this.cameras.main.setBackgroundColor(PAL.khaki);
    const g = this.add.graphics();
    g.fillStyle(PAL.shadow).fillRect(0, 0, W, Math.floor(H * 0.35)); // 현무암 벽
    for (let y = 2; y < H * 0.35; y += 6) for (let x = (y % 12) * 2; x < W; x += 14) g.fillStyle(PAL.mauve).fillRect(x, y, 10, 4);
    g.fillStyle(PAL.taupe).fillRect(0, Math.floor(H * 0.35), W, 2);

    // 항아리 여섯 개(2배로 크게)
    const gap = Math.min(30, (W - 30) / JARS);
    const jy = Math.floor(H * 0.62);
    for (let i = 0; i < JARS; i++) {
      const x = Math.round(W / 2 + (i - (JARS - 1) / 2) * gap);
      const water = this.add.rectangle(x, jy + 7, 8, 0, PAL.sky).setOrigin(0.5, 1).setDepth(2);
      this.waters.push(water);
      this.jars.push(this.add.image(x, jy + 8, 'jar').setOrigin(0.5, 1).setScale(2).setDepth(1).setAlpha(0.95));
    }
    // 수위 막대
    this.meterX = W - 20;
    this.meterTop = Math.floor(H * 0.2);
    this.meterH = Math.floor(H * 0.4);
    g.fillStyle(PAL.ink).fillRect(this.meterX - 5, this.meterTop - 1, 10, this.meterH + 2);
    g.fillStyle(PAL.night).fillRect(this.meterX - 4, this.meterTop, 8, this.meterH);
    g.fillStyle(PAL.gold).fillRect(this.meterX - 4, this.meterTop, 8, Math.round(this.meterH * 0.14)); // 아귀 칸
    this.meter = this.add.rectangle(this.meterX, this.meterTop + this.meterH, 8, 0, PAL.sky).setOrigin(0.5, 1);
    bt(this, this.meterX, this.meterTop - 12, '물통', PAL.ink).setOrigin(0.5, 0);
    this.add.image(this.jars[0].x, jy - 30, 'halo').setScale(0.4).setAlpha(0).setName('focus');
  }

  protected begin() {
    this.playing = true;
    this.setStatus(`항아리 ${this.filled}/${JARS}`);
    this.input.on('pointerdown', () => this.pour());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') && this.pour());
  }

  private pour() {
    if (!this.playing || this.finished) return;
    if (this.level >= 0.86) {
      // 아귀까지
      Sfx.pour();
      const w = this.waters[this.filled];
      this.tweens.add({ targets: w, height: 30, duration: 400 });
      this.tweens.add({ targets: this.jars[this.filled], y: this.jars[this.filled].y - 2, duration: 80, yoyo: true });
      this.filled++;
      this.speed += 0.12;
      this.level = 0;
      this.setStatus(`항아리 ${this.filled}/${JARS}`);
      if (this.filled >= JARS) this.reveal();
    } else {
      // 모자람: 벌칙 없이 다시
      this.failOnce();
      this.level = 0;
      this.cameras.main.shake(120, 0.004);
    }
  }

  /** 여섯 항아리를 다 채운 뒤: 물빛이 포도주 빛으로 바뀌는 연출 */
  private reveal() {
    this.playing = false;
    this.time.delayedCall(700, () => {
      this.waters.forEach((w, i) =>
        this.time.delayedCall(i * 160, () => {
          w.setFillStyle(PAL.wine);
          Sfx.tick();
          for (let k = 0; k < 6; k++) {
            const p = this.add.rectangle(w.x + Phaser.Math.Between(-4, 4), w.y - 28, 2, 2, k % 2 ? PAL.berry : PAL.rose).setDepth(3);
            this.tweens.add({ targets: p, y: p.y - Phaser.Math.Between(10, 24), alpha: 0, duration: 900, onComplete: () => p.destroy() });
          }
        }),
      );
      this.time.delayedCall(JARS * 160 + 400, () => this.complete());
    });
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    this.level += this.dir * this.speed * (delta / 1000);
    if (this.level >= 1) (this.level = 1), (this.dir = -1);
    if (this.level <= 0) (this.level = 0), (this.dir = 1);
    this.meter.height = Math.round(this.meterH * this.level);
    this.meter.setFillStyle(this.level >= 0.86 ? PAL.foam : PAL.sky);
  }
}
