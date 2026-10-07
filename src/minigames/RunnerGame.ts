// 4장: 왕의 신하가 집으로 돌아가는 길, 주인공도 가버나움 쪽으로 서둘러 달려간다.
// 길의 돌은 확인 버튼(또는 화면)으로 뛰어넘는다. 부딪혀도 잠깐 비틀거릴 뿐이다.
import Phaser from 'phaser';
import { PAL, WORLD as WC } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { MiniGame } from './MiniGame.ts';

const LENGTH = 1800;

export class RunnerGame extends MiniGame {
  readonly title = '가버나움으로';
  readonly howTo = '갈릴리 언덕길을 내려가 가버나움까지 달려간다. 길에 돌이 나오면 확인 버튼이나 화면을 눌러 뛰어넘자.';

  private player!: Phaser.GameObjects.Sprite;
  private ground = 0;
  private vy = 0;
  private dist = 0;
  private speed = 90;
  private stunned = 0;
  private rocks: Phaser.GameObjects.Image[] = [];
  private scenery!: Phaser.GameObjects.TileSprite;
  private road!: Phaser.GameObjects.TileSprite;
  private bar!: Phaser.GameObjects.Rectangle;
  private playing = false;

  constructor() {
    super('Runner');
  }

  protected build() {
    const { W, H } = this;
    this.rocks = [];
    this.dist = 0;
    this.vy = 0;
    this.stunned = 0;
    this.playing = false;
    this.ground = Math.floor(H * 0.72);
    this.cameras.main.setBackgroundColor(WC.skyDay[0]);
    // 먼 갈릴리 바다와 언덕, 길가의 올리브 나무 한 줄
    this.add.rectangle(0, this.ground - 34, W, 8, WC.skyDay[2]).setOrigin(0);
    this.add.rectangle(0, this.ground - 26, W, 26, PAL.olive).setOrigin(0);
    const treeH = this.textures.getFrame('tree').height;
    this.scenery = this.add.tileSprite(0, this.ground - treeH - 4, W, treeH, 'tree').setOrigin(0);
    this.add.rectangle(0, this.ground - 2, W, H, WC.dust).setOrigin(0);
    this.road = this.add.tileSprite(0, this.ground, W, 16, 'dirt').setOrigin(0);
    this.player = this.add.sprite(Math.floor(W * 0.25), this.ground, 'player', 8).setOrigin(0.5, 1).play('player-walk-side');
    this.player.anims.timeScale = 1.6;
    // 진행 막대
    const g = this.add.graphics();
    g.fillStyle(PAL.ink).fillRect(10, 24, W - 20, 6);
    this.bar = this.add.rectangle(11, 25, 0, 4, PAL.gold).setOrigin(0);
    for (let i = 0; i < 12; i++) this.spawnRock(W + 120 + i * 150 + ((i * 53) % 60));
  }

  private spawnRock(x: number) {
    this.rocks.push(this.add.image(x, this.ground + 2, 'rock').setOrigin(0.5, 1).setScale(0.8));
  }

  protected begin() {
    this.playing = true;
    this.setStatus('가나 → 가버나움');
    const jump = () => {
      if (this.playing && this.player.y >= this.ground) {
        this.vy = -170;
        Sfx.tick();
      }
    };
    this.input.on('pointerdown', jump);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'ArrowUp') && jump());
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const dt = delta / 1000;
    const sp = this.stunned > 0 ? 30 : this.speed;
    this.stunned -= dt;
    this.dist += sp * dt;
    this.road.tilePositionX += sp * dt;
    this.scenery.tilePositionX += sp * dt * 0.4;
    // 점프
    this.vy += 520 * dt;
    this.player.y = Math.min(this.ground, this.player.y + this.vy * dt);
    if (this.player.y >= this.ground) this.vy = 0;
    for (const r of this.rocks) {
      r.x -= sp * dt;
      const hit = Math.abs(r.x - this.player.x) < 8 && this.player.y > this.ground - 8 && r.visible;
      if (hit && this.stunned <= 0) {
        this.stunned = 0.7;
        r.setVisible(false);
        this.failOnce();
        this.cameras.main.shake(150, 0.006);
      }
    }
    this.bar.width = Math.round((this.W - 22) * Math.min(1, this.dist / LENGTH));
    if (this.dist >= LENGTH) {
      this.playing = false;
      this.player.anims.stop();
      this.complete();
    }
  }
}
