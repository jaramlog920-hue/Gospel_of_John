// 12장 베다니의 저녁: 옥합에서 퍼진 향기가 온 집에 가득해진다. 잠깐 쉬어 가는 연출(설계 문서 4장).
import Phaser from 'phaser';
import { PAL, WORLD as WC } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { tone } from '../audio/sfx.ts';
import { MiniGame } from './MiniGame.ts';

export class ScentGame extends MiniGame {
  readonly title = '온 집에 가득한 향기';
  readonly howTo = '향기가 집 안에 퍼져 간다. 천천히 집 안을 걸으며 향기가 어디까지 닿는지 보자.';

  private player!: Phaser.GameObjects.Sprite;
  private motes: Phaser.GameObjects.Rectangle[] = [];
  private t = 0;
  private playing = false;

  constructor() {
    super('Scent');
  }

  protected build() {
    const { W, H } = this;
    this.motes = [];
    this.t = 0;
    this.playing = false;
    this.cameras.main.setBackgroundColor(WC.plaster);
    const rt = this.add.renderTexture(0, Math.floor(H * 0.25), W, H).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) rt.batchDraw('floor', x, y);
    rt.endDraw();
    this.add.image(W / 2, H * 0.5, 'table');
    this.add.image(W / 2 - 26, H * 0.5 + 6, 'cushion');
    this.add.image(W / 2 + 26, H * 0.5 + 6, 'cushion');
    this.add.image(W / 2 + 6, H * 0.5 - 6, 'jar').setScale(0.8);
    this.player = this.add.sprite(20, H * 0.75, 'player', 8);
  }

  protected begin() {
    this.playing = true;
    this.setStatus('향기가 퍼진다');
    [523, 659, 784].forEach((f, i) => tone(f, 900, { type: 'sine', delay: i * 400, volume: 0.03 }));
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const dt = delta / 1000;
    this.t += dt;
    const p = this.player;
    const v = this.controls.move(p);
    p.x = Phaser.Math.Clamp(p.x + v.x * 40 * dt, 8, this.W - 8);
    p.y = Phaser.Math.Clamp(p.y + v.y * 40 * dt, this.H * 0.3, this.H - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    // 향기 알갱이가 옥합에서 온 방으로 번진다.
    if (this.motes.length < 160 && Math.random() < 0.8) {
      const m = this.add.rectangle(this.W / 2 + 6, this.H * 0.5 - 8, 2, 2, Math.random() < 0.5 ? PAL.lavender : PAL.rose, 0.9);
      this.motes.push(m);
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * Math.max(this.W, this.H) * 0.7 * Math.min(1, this.t / 8);
      this.tweens.add({ targets: m, x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r * 0.7, alpha: 0.35, duration: 3000 + Math.random() * 2000 });
    }
    this.setStatus(`향기가 퍼진다 ${Math.min(100, Math.round((this.t / 10) * 100))}%`);
    if (this.t >= 10) {
      this.playing = false;
      faceAndWalk(p, 'player', 0, 0);
      this.complete();
    }
  }
}
