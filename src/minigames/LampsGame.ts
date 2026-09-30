// 8장 초막절: 명절 저녁, 성전 뜰 곳곳의 꺼진 등잔을 찾아 불을 붙인다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { Sfx } from '../audio/sfx.ts';
import { MiniGame } from './MiniGame.ts';

const WORLD = 520;
const LAMPS = 6;

export class LampsGame extends MiniGame {
  readonly title = '명절의 등불';
  readonly howTo = '초막절 저녁, 사람들 사이 곳곳에 꺼진 등잔이 있다. 가까이 가서 불을 붙여 뜰을 밝히자.';

  private player!: Phaser.GameObjects.Sprite;
  private lamps: { img: Phaser.GameObjects.Image; lit: boolean }[] = [];
  private shade!: Phaser.GameObjects.Rectangle;
  private top = 50;
  private playing = false;

  constructor() {
    super('Lamps');
  }

  protected build() {
    const { H } = this;
    this.lamps = [];
    this.playing = false;
    this.top = Math.floor(H * 0.3);
    this.cameras.main.setBackgroundColor(PAL.purple);
    this.add.rectangle(0, this.top - 30, WORLD, 30, PAL.khaki).setOrigin(0);
    const rt = this.add.renderTexture(0, this.top, WORLD, H - this.top).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < H - this.top; y += 16) for (let x = 0; x < WORLD; x += 16) rt.batchDraw('paving', x, y);
    rt.endDraw();
    for (let x = 10; x < WORLD; x += 40) this.add.image(x, this.top, 'pillar').setOrigin(0.5, 1).setScale(0.8);
    // 나뭇가지로 지은 초막 몇 채
    for (let x = 60; x < WORLD; x += 150) this.add.image(x, this.top + 4, 'vine').setOrigin(0.5, 1).setScale(1.4);
    const y = (f: number) => Math.round(this.top + 14 + f * (H - this.top - 24));
    for (let i = 0; i < 10; i++) {
      const s = this.add.sprite(40 + i * 48, y(((i * 37) % 90) / 100), `crowd${i % 6}`, 0);
      s.setDepth(s.y);
    }
    for (let i = 0; i < LAMPS; i++) {
      const img = this.add.image(70 + i * 75 + ((i * 29) % 30), y(((i * 61) % 80) / 100 + 0.1), 'lamp-off');
      img.setDepth(img.y);
      this.lamps.push({ img, lit: false });
    }
    this.shade = this.add.rectangle(0, 0, this.W, this.H, PAL.dusk, 0.55).setOrigin(0).setScrollFactor(0).setDepth(800).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.player = this.add.sprite(24, y(0.5), 'player', 8);
    this.cameras.main.setBounds(0, 0, WORLD, H).startFollow(this.player, true, 1, 1);
  }

  protected begin() {
    this.playing = true;
    this.status();
  }

  private status() {
    this.setStatus(`밝힌 등잔 ${this.lamps.filter((l) => l.lit).length}/${LAMPS}`);
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const p = this.player;
    const v = this.controls.move(p);
    const step = 60 * (delta / 1000);
    p.x = Phaser.Math.Clamp(p.x + v.x * step, 10, WORLD - 10);
    p.y = Phaser.Math.Clamp(p.y + v.y * step, this.top + 10, this.H - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    p.setDepth(p.y);
    for (const l of this.lamps) {
      if (l.lit || Phaser.Math.Distance.Between(p.x, p.y, l.img.x, l.img.y) > 14) continue;
      l.lit = true;
      l.img.setTexture('lamp-on');
      this.add.image(l.img.x, l.img.y - 4, 'halo').setScale(1.2).setBlendMode(Phaser.BlendModes.ADD).setDepth(801).setAlpha(0.8);
      Sfx.good();
      this.status();
      const n = this.lamps.filter((x) => x.lit).length;
      this.shade.setAlpha(0.55 - n * 0.06);
      if (n >= LAMPS) {
        this.playing = false;
        faceAndWalk(p, 'player', 0, 0);
        this.complete();
      }
    }
  }
}
