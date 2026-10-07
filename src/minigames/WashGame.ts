// 13장 다락방: 저녁을 앞두고 바깥 우물에서 물을 길어 방의 큰 물 항아리를 채운다.
// 발을 씻기시는 일은 본문(13:4–5)대로 두고, 주인공은 그 전에 물을 준비하는 일만 돕는다(설계 원칙 5).
import Phaser from 'phaser';
import { PAL, WORLD as WC } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { Sfx } from '../audio/sfx.ts';
import { bt } from '../ui/text.ts';
import { MiniGame } from './MiniGame.ts';

const TRIPS = 5;

export class WashGame extends MiniGame {
  readonly title = '물 길어 오기';
  readonly howTo = '저녁 전에 방 안의 큰 물 항아리를 채워 두자. 오른쪽 문밖 우물에서 물을 떠서, 왼쪽 항아리에 붓는다. 다섯 번 오가면 된다.';

  private player!: Phaser.GameObjects.Sprite;
  private carrying = false;
  private trips = 0;
  private jarWater!: Phaser.GameObjects.Rectangle;
  private bucket!: Phaser.GameObjects.Image;
  private playing = false;

  constructor() {
    super('Wash');
  }

  protected build() {
    const { W, H } = this;
    this.carrying = false;
    this.trips = 0;
    this.playing = false;
    this.cameras.main.setBackgroundColor(WC.plaster);
    const rt = this.add.renderTexture(0, Math.floor(H * 0.3), W, H).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) rt.batchDraw(x > W - 60 ? 'paving' : 'floor', x, y);
    rt.endDraw();
    this.add.rectangle(W - 62, Math.floor(H * 0.3), 4, H, PAL.bark).setOrigin(0); // 문턱
    this.add.image(W - 30, H * 0.55, 'well');
    bt(this, W - 30, H * 0.55 - 20, '우물', PAL.ink).setOrigin(0.5, 1);
    this.add.image(24, H * 0.55, 'jar').setScale(2.2);
    this.jarWater = this.add.rectangle(24, H * 0.55 + 12, 10, 0, PAL.sky).setOrigin(0.5, 1);
    bt(this, 24, H * 0.55 - 26, '항아리', PAL.ink).setOrigin(0.5, 1);
    this.add.image(W / 2, H * 0.45, 'table');
    this.player = this.add.sprite(W / 2, H * 0.75, 'player', 8);
    this.bucket = this.add.image(0, 0, 'jar').setScale(0.6).setVisible(false);
  }

  protected begin() {
    this.playing = true;
    this.status();
  }

  private status() {
    this.setStatus(this.carrying ? '물을 항아리로!' : `채운 물 ${this.trips}/${TRIPS} · 우물로`);
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const p = this.player;
    const v = this.controls.move(p);
    const step = 60 * (delta / 1000);
    p.x = Phaser.Math.Clamp(p.x + v.x * step, 10, this.W - 10);
    p.y = Phaser.Math.Clamp(p.y + v.y * step, this.H * 0.35, this.H - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    this.bucket.setPosition(p.x, p.y - 16).setVisible(this.carrying);
    if (!this.carrying && p.x > this.W - 44) {
      this.carrying = true;
      Sfx.splash();
      this.status();
    }
    if (this.carrying && p.x < 44) {
      this.carrying = false;
      this.trips++;
      Sfx.pour();
      this.tweens.add({ targets: this.jarWater, height: (this.trips / TRIPS) * 22, duration: 400 });
      this.status();
      if (this.trips >= TRIPS) {
        this.playing = false;
        faceAndWalk(p, 'player', 0, 0);
        this.complete();
      }
    }
  }
}
