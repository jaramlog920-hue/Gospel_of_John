// 9장 실로암: 주인공이 눈을 감고, 앞을 보지 못한 그 사람이 걸었을 길을 소리로만 따라가 본다.
// 물방울 소리가 가까울수록 빠르고 높게, 왼쪽·오른쪽에서 들린다. 소리를 못 듣는 사람(무음 모드 포함)을 위해
// 화면 가장자리에 물결 표시를 띄우고, 위쪽에 거리(멀다·가깝다)를 글로 알려 준다.
// 2026-10-04: 어떻게 하는지 알기 어렵다는 말에 내 모습을 희미하게 보이고, 물결을 크게, 방향을 주인공 기준으로 고쳤다.
import Phaser from 'phaser';
import { PAL, WORLD as WC } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { Sfx } from '../audio/sfx.ts';
import { say } from '../ui/Dialog.ts';
import { MiniGame } from './MiniGame.ts';

export class BlindGame extends MiniGame {
  readonly title = '눈을 감고';
  readonly howTo = '눈을 감고 그 사람이 걸었을 길을 따라가 본다. 화면이 캄캄해지면 물방울 소리가 나는 쪽으로 걸어가자. 화면 가장자리에 퍼지는 물결이 그쪽을 가리키고, 가까울수록 소리가 빨라진다.';

  private player!: Phaser.GameObjects.Sprite;
  private ghost!: Phaser.GameObjects.Sprite;
  private goal = { x: 0, y: 0 };
  private dark!: Phaser.GameObjects.Rectangle;
  private pulse!: Phaser.GameObjects.Arc;
  private nextBeep = 0;
  private playing = false;
  private worldW = 400;
  private worldH = 300;
  private startDist = 1;
  private lastBand = '';

  constructor() {
    super('Blind');
  }

  protected build() {
    const { W, H } = this;
    this.playing = false;
    this.lastBand = '';
    this.worldW = Math.max(W * 1.6, 360);
    this.worldH = Math.max(H * 1.3, 260);
    const rt = this.add.renderTexture(0, 0, this.worldW, this.worldH).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < this.worldH; y += 16) for (let x = 0; x < this.worldW; x += 16) rt.batchDraw('paving', x, y);
    rt.endDraw();
    this.goal = { x: this.worldW - 50, y: this.worldH - 50 };
    // 실로암 못과 내려가는 계단
    this.add.rectangle(this.goal.x - 30, this.goal.y - 20, 70, 50, WC.wallTop).setOrigin(0);
    this.add.tileSprite(this.goal.x - 24, this.goal.y - 12, 58, 36, 'water').setOrigin(0);
    this.player = this.add.sprite(40, 40, 'player', 0);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH).startFollow(this.player, true, 1, 1);
    this.dark = this.add.rectangle(0, 0, W, H, PAL.ink, 1).setOrigin(0).setScrollFactor(0).setDepth(900);
    // 어둠 위에 내 모습만 희미하게: 걷고 있다는 것을 느끼게 한다(길과 못은 보이지 않는다).
    this.ghost = this.add.sprite(40, 40, 'player', 0).setDepth(901).setAlpha(0.35);
    this.pulse = this.add.circle(0, 0, 9, PAL.skyLight, 0).setScrollFactor(0).setDepth(902).setStrokeStyle(2, PAL.skyLight, 1);
    this.startDist = Phaser.Math.Distance.Between(40, 40, this.goal.x, this.goal.y);
  }

  protected begin() {
    this.playing = true;
    this.band(Phaser.Math.Distance.Between(this.player.x, this.player.y, this.goal.x, this.goal.y));
  }

  /** 거리를 세 단계 글로 알려 준다 */
  private band(d: number) {
    const label = d > this.startDist * 0.6 ? '물소리: 멀다' : d > 90 ? '물소리: 가깝다' : '물소리: 아주 가깝다';
    if (label === this.lastBand) return;
    this.lastBand = label;
    this.setStatus(label);
  }

  update(time: number, delta: number) {
    if (!this.playing) return;
    const p = this.player;
    const v = this.controls.move(p);
    const step = 45 * (delta / 1000);
    p.x = Phaser.Math.Clamp(p.x + v.x * step, 8, this.worldW - 8);
    p.y = Phaser.Math.Clamp(p.y + v.y * step, 8, this.worldH - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    faceAndWalk(this.ghost, 'player', v.x, v.y);
    this.ghost.setPosition(p.x, p.y);
    const d = Phaser.Math.Distance.Between(p.x, p.y, this.goal.x, this.goal.y);
    this.band(d);
    if (time > this.nextBeep) {
      const near = Phaser.Math.Clamp(1 - d / this.startDist, 0, 1);
      Sfx.drip(near, Phaser.Math.Clamp((this.goal.x - p.x) / 120, -1, 1));
      this.nextBeep = time + Phaser.Math.Linear(900, 220, near);
      // 화면 가장자리의 물결: 주인공의 화면 위치에서 못 쪽으로 그은 선이 화면 끝에 닿는 곳
      const cam = this.cameras.main;
      const sx = p.x - cam.scrollX;
      const sy = p.y - cam.scrollY;
      const ang = Phaser.Math.Angle.Between(p.x, p.y, this.goal.x, this.goal.y);
      const m = 16;
      const cx = Math.cos(ang);
      const cy = Math.sin(ang);
      const tx = cx > 0 ? (this.W - m - sx) / cx : cx < 0 ? (m - sx) / cx : Infinity;
      const ty = cy > 0 ? (this.H - m - sy) / cy : cy < 0 ? (m - sy) / cy : Infinity;
      const t = Math.max(0, Math.min(tx, ty, d));
      this.pulse.setPosition(sx + cx * t, sy + cy * t).setScale(1).setAlpha(1);
      this.tweens.killTweensOf(this.pulse);
      this.tweens.add({ targets: this.pulse, scale: 3, alpha: 0, duration: 600 });
    }
    if (d < 22) this.arrive();
  }

  private async arrive() {
    this.playing = false;
    faceAndWalk(this.player, 'player', 0, 0);
    this.ghost.setVisible(false);
    this.controls.busy = true;
    await say(this, '나', '물이 발끝에 닿았다. 눈을 뜬다.');
    this.cameras.main.flash(900, 255, 250, 240);
    this.tweens.add({ targets: this.dark, alpha: 0, duration: 1200, onComplete: () => this.complete() });
  }
}
