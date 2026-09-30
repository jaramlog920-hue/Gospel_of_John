// 10장 선한 목자: 목자의 부름(확인 버튼)을 알아듣는 양만 고개를 들고 따라온다. 그 양들을 우리로 이끈다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { faceAndWalk, grassTile } from '../art/textures.ts';
import { Sfx } from '../audio/sfx.ts';
import { bt } from '../ui/text.ts';
import { MiniGame } from './MiniGame.ts';

interface Sheep {
  img: Phaser.GameObjects.Image;
  mine: boolean;
  follow: number;
  home: boolean;
}

export class VoiceGame extends MiniGame {
  readonly title = '목자의 소리';
  readonly howTo = '확인 버튼을 누르면 목자의 부름이 울린다. 그 소리를 알아듣는 양만 고개를 들고(♪) 잠시 나를 따라온다. 그 양들을 왼쪽 돌담 우리로 데려가자.';

  private player!: Phaser.GameObjects.Sprite;
  private sheep: Sheep[] = [];
  private penX = 70;
  private top = 50;
  private playing = false;

  constructor() {
    super('Voice');
  }

  protected build() {
    const { W, H } = this;
    this.sheep = [];
    this.playing = false;
    this.top = Math.floor(H * 0.25);
    this.cameras.main.setBackgroundColor(PAL.rose);
    const rt = this.add.renderTexture(0, this.top, W, H - this.top).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < H - this.top; y += 16) for (let x = 0; x < W; x += 16) rt.batchDraw(grassTile(x, y), x, y);
    rt.endDraw();
    // 돌담 우리(오른쪽 면이 문)
    this.penX = Math.min(80, Math.floor(W * 0.3));
    for (let x = 0; x < this.penX; x += 16) this.add.image(x + 8, this.top + 8, 'stonewall');
    for (let y = this.top + 14; y < H; y += 10) this.add.image(this.penX, y, 'stonewall').setAngle(90).setVisible(y < this.top + 30 || y > H - 40);
    bt(this, 6, this.top + 18, '우리', PAL.ink);
    for (let i = 0; i < 8; i++) {
      const img = this.add.image(this.penX + 30 + ((i * 67) % Math.max(40, W - this.penX - 50)), this.top + 30 + ((i * 41) % Math.max(40, H - this.top - 50)), 'sheep');
      img.setFlipX(i % 2 === 0);
      this.sheep.push({ img, mine: i % 2 === 1, follow: 0, home: false });
    }
    this.player = this.add.sprite(W - 20, H * 0.6, 'player', 8).setFlipX(true);
  }

  protected begin() {
    this.playing = true;
    this.status();
    const call = () => this.call();
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') && call());
    this.add
      .zone(0, 0, this.W, this.H)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', (p: Phaser.Input.Pointer) => p.getDuration() < 200 && Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 20 && call());
  }

  private status() {
    const mine = this.sheep.filter((s) => s.mine);
    this.setStatus(`우리에 들어온 양 ${mine.filter((s) => s.home).length}/${mine.length}`);
  }

  private call() {
    if (!this.playing) return;
    Sfx.call();
    this.sheep.forEach((s, i) => {
      if (!s.mine || s.home) return;
      s.follow = 6;
      this.time.delayedCall(700 + i * 80, () => Sfx.bleat(440, Phaser.Math.Clamp((s.img.x - this.W / 2) / (this.W / 2), -1, 1)));
      const note = bt(this, s.img.x, s.img.y - 14, '♪', PAL.honey).setOrigin(0.5);
      this.tweens.add({ targets: note, y: note.y - 10, alpha: 0, duration: 900, onComplete: () => note.destroy() });
    });
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const dt = delta / 1000;
    const p = this.player;
    const v = this.controls.move(p);
    p.x = Phaser.Math.Clamp(p.x + v.x * 60 * dt, 8, this.W - 8);
    p.y = Phaser.Math.Clamp(p.y + v.y * 60 * dt, this.top + 10, this.H - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    p.setDepth(p.y);
    for (const s of this.sheep) {
      if (s.home) continue;
      if (s.follow > 0) {
        s.follow -= dt;
        const d = Phaser.Math.Distance.Between(p.x, p.y, s.img.x, s.img.y);
        if (d > 16) {
          const a = Phaser.Math.Angle.Between(s.img.x, s.img.y, p.x, p.y);
          s.img.x += Math.cos(a) * 50 * dt;
          s.img.y += Math.sin(a) * 50 * dt;
          s.img.setFlipX(Math.cos(a) < 0);
        }
      }
      s.img.setDepth(s.img.y);
      if (s.mine && s.img.x < this.penX - 6) {
        s.home = true;
        Sfx.good();
        this.tweens.add({ targets: s.img, x: 16 + Math.random() * (this.penX - 30), duration: 500 });
        this.status();
        if (this.sheep.filter((x) => x.mine).every((x) => x.home)) {
          this.playing = false;
          faceAndWalk(p, 'player', 0, 0);
          this.complete();
        }
      }
    }
  }
}
