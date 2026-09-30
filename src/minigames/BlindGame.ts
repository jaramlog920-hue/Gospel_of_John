// 9장 실로암: 주인공이 눈을 감고, 앞을 보지 못한 그 사람이 걸었을 길을 소리로만 따라가 본다.
// 물소리가 가까울수록 빠르게, 왼쪽·오른쪽에서 들린다. 소리를 못 듣는 사람을 위해 화면 가장자리에 옅은 물결 표시도 둔다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { tone } from '../audio/sfx.ts';
import { say } from '../ui/Dialog.ts';
import { MiniGame } from './MiniGame.ts';

export class BlindGame extends MiniGame {
  readonly title = '눈을 감고';
  readonly howTo = '눈을 감고 그 사람이 걸었을 길을 따라가 본다. 화면이 캄캄해진다. 물소리(가장자리의 물결 표시)를 따라 실로암 못까지 가자. 소리를 켜면 더 쉽다.';

  private player!: Phaser.GameObjects.Sprite;
  private goal = { x: 0, y: 0 };
  private dark!: Phaser.GameObjects.Rectangle;
  private pulse!: Phaser.GameObjects.Arc;
  private nextBeep = 0;
  private playing = false;
  private worldW = 400;
  private worldH = 300;

  constructor() {
    super('Blind');
  }

  protected build() {
    const { W, H } = this;
    this.playing = false;
    this.worldW = Math.max(W * 1.6, 360);
    this.worldH = Math.max(H * 1.3, 260);
    const rt = this.add.renderTexture(0, 0, this.worldW, this.worldH).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < this.worldH; y += 16) for (let x = 0; x < this.worldW; x += 16) rt.batchDraw('paving', x, y);
    rt.endDraw();
    this.goal = { x: this.worldW - 50, y: this.worldH - 50 };
    // 실로암 못과 내려가는 계단
    this.add.rectangle(this.goal.x - 30, this.goal.y - 20, 70, 50, PAL.cream).setOrigin(0);
    this.add.tileSprite(this.goal.x - 24, this.goal.y - 12, 58, 36, 'water').setOrigin(0);
    this.player = this.add.sprite(40, 40, 'player', 0);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH).startFollow(this.player, true, 1, 1);
    this.dark = this.add.rectangle(0, 0, W, H, PAL.ink, 1).setOrigin(0).setScrollFactor(0).setDepth(900);
    this.pulse = this.add.circle(0, 0, 6, PAL.skyLight, 0).setScrollFactor(0).setDepth(901).setStrokeStyle(1, PAL.skyLight, 0.9);
  }

  protected begin() {
    this.playing = true;
    this.setStatus('물소리를 따라가자');
  }

  update(time: number, delta: number) {
    if (!this.playing) return;
    const p = this.player;
    const v = this.controls.move(p);
    const step = 45 * (delta / 1000);
    p.x = Phaser.Math.Clamp(p.x + v.x * step, 8, this.worldW - 8);
    p.y = Phaser.Math.Clamp(p.y + v.y * step, 8, this.worldH - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    const d = Phaser.Math.Distance.Between(p.x, p.y, this.goal.x, this.goal.y);
    if (time > this.nextBeep) {
      const pan = Phaser.Math.Clamp((this.goal.x - p.x) / 120, -1, 1);
      tone(520 + Math.max(0, 300 - d), 90, { type: 'sine', pan, volume: 0.07 });
      this.nextBeep = time + Phaser.Math.Clamp(d * 3, 180, 1100);
      // 화면 가장자리에 물결 표시(소리를 못 듣는 사람을 위해)
      const ang = Phaser.Math.Angle.Between(p.x, p.y, this.goal.x, this.goal.y);
      const r = Math.min(this.W, this.H) / 2 - 14;
      this.pulse.setPosition(this.W / 2 + Math.cos(ang) * r, this.H / 2 + Math.sin(ang) * r).setScale(1).setAlpha(1);
      this.tweens.add({ targets: this.pulse, scale: 2.5, alpha: 0, duration: 500 });
    }
    if (d < 22) this.arrive();
  }

  private async arrive() {
    this.playing = false;
    faceAndWalk(this.player, 'player', 0, 0);
    this.controls.busy = true;
    await say(this, '나', '물이 발끝에 닿았다. 눈을 뜬다.');
    this.cameras.main.flash(900, 255, 250, 240);
    this.tweens.add({ targets: this.dark, alpha: 0, duration: 1200, onComplete: () => this.complete() });
  }
}
