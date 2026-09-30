// 2장 성전: 뜰에 흩어진 소와 양을 왼쪽 문밖으로 몬다. 짐승은 주인공이 다가가면 반대쪽으로 달아난다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { Sfx } from '../audio/sfx.ts';
import { bt } from '../ui/text.ts';
import { MiniGame } from './MiniGame.ts';

interface Animal {
  img: Phaser.GameObjects.Image;
  out: boolean;
}

export class HerdGame extends MiniGame {
  readonly title = '성전 뜰의 짐승들';
  readonly howTo = '소와 양이 뜰에 흩어져 있다. 다가가면 반대쪽으로 달아난다. 짐승들 오른쪽으로 돌아가서 왼쪽 문밖으로 몰아내자.';

  private player!: Phaser.GameObjects.Sprite;
  private animals: Animal[] = [];
  private top = 40;
  private playing = false;

  constructor() {
    super('Herd');
  }

  protected build() {
    const { W, H } = this;
    this.animals = [];
    this.playing = false;
    this.top = Math.floor(H * 0.3);
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) rt.batchDraw('paving', x, y);
    rt.endDraw();
    const g = this.add.graphics();
    g.fillStyle(PAL.khaki).fillRect(0, 0, W, this.top - 4);
    for (let x = 16; x < W; x += 36) this.add.image(x, this.top, 'pillar').setOrigin(0.5, 1).setScale(0.7);
    // 왼쪽 문
    g.fillStyle(PAL.ink).fillRect(0, this.top + 10, 12, H - this.top - 20);
    g.fillStyle(PAL.rust).fillRect(10, this.top + 8, 3, H - this.top - 16);
    bt(this, 16, this.top + 12, '◀ 문', PAL.ink);
    const keys = ['ox', 'ox', 'sheep', 'sheep', 'sheep', 'ox', 'sheep'];
    keys.forEach((k, i) => {
      const img = this.add.image(W * 0.35 + ((i * 53) % Math.floor(W * 0.55)), this.top + 20 + ((i * 37) % (H - this.top - 40)), k);
      this.animals.push({ img, out: false });
    });
    this.player = this.add.sprite(W - 20, H * 0.65, 'player', 8);
  }

  protected begin() {
    this.playing = true;
    this.status();
  }

  private status() {
    this.setStatus(`문밖으로 ${this.animals.filter((a) => a.out).length}/${this.animals.length}`);
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const dt = delta / 1000;
    const p = this.player;
    const v = this.controls.move(p);
    p.x = Phaser.Math.Clamp(p.x + v.x * 70 * dt, 16, this.W - 8);
    p.y = Phaser.Math.Clamp(p.y + v.y * 70 * dt, this.top + 8, this.H - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    p.setDepth(p.y);
    for (const a of this.animals) {
      if (a.out) continue;
      const img = a.img;
      const d = Phaser.Math.Distance.Between(p.x, p.y, img.x, img.y);
      if (d < 40) {
        // 주인공에게서 멀어지는 쪽으로 달아난다.
        const ang = Phaser.Math.Angle.Between(p.x, p.y, img.x, img.y);
        const sp = (1 - d / 40) * 90 * dt + 20 * dt;
        img.x += Math.cos(ang) * sp;
        img.y += Math.sin(ang) * sp;
        img.setFlipX(Math.cos(ang) < 0);
        if (Math.random() < 0.01) Sfx.bleat(img.texture.key === 'ox' ? 180 : 420);
      }
      img.x = Math.min(img.x, this.W - 10);
      img.y = Phaser.Math.Clamp(img.y, this.top + 10, this.H - 10);
      img.setDepth(img.y);
      if (img.x < 14) {
        a.out = true;
        Sfx.good();
        this.tweens.add({ targets: img, x: -20, alpha: 0, duration: 400 });
        this.status();
        if (this.animals.every((x) => x.out)) {
          this.playing = false;
          this.complete();
        }
      } else if (img.x < 20) img.x -= 30 * dt;
    }
  }
}
