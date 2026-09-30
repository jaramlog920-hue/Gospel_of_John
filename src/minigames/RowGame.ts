// 6장 밤바다: 바람과 물결을 헤치고 노를 젓는다. 왼쪽·오른쪽을 번갈아 누르면 배가 나아간다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { bt } from '../ui/text.ts';
import { MiniGame } from './MiniGame.ts';

// 개역한글 본문의 거리 단위(리)를 따른다. 요 6:19 참고.
const GOAL = 10;

export class RowGame extends MiniGame {
  readonly title = '노 젓기';
  readonly howTo = '큰 바람이 불어 물결이 높다. 왼쪽과 오른쪽을 번갈아 누르면 노를 저어 나아간다(화면 왼쪽·오른쪽을 번갈아 눌러도 된다).';

  private boat!: Phaser.GameObjects.Image;
  private sea!: Phaser.GameObjects.TileSprite;
  private dist = 0;
  private last: 'L' | 'R' | null = null;
  private vel = 0;
  private playing = false;

  constructor() {
    super('Row');
  }

  protected build() {
    const { W, H } = this;
    this.dist = 0;
    this.vel = 0;
    this.last = null;
    this.playing = false;
    this.cameras.main.setBackgroundColor(PAL.dusk);
    for (let i = 0; i < 30; i++) this.add.rectangle((i * 83) % W, (i * 37) % Math.floor(H * 0.35), 1, 1, PAL.white, 0.7);
    this.sea = this.add.tileSprite(0, Math.floor(H * 0.4), W, H, 'water').setOrigin(0).setTint(PAL.indigo);
    this.boat = this.add.image(W / 2, H * 0.62, 'boat').setScale(1.5);
    this.tweens.add({ targets: this.boat, angle: 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add.rectangle(0, 0, W, H, PAL.dusk, 0.35).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    bt(this, 10, H - 20, '◀ 왼쪽', PAL.mist);
    bt(this, W - 10, H - 20, '오른쪽 ▶', PAL.mist).setOrigin(1, 0);
  }

  protected begin() {
    this.playing = true;
    this.status();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.stroke(p.x < this.W / 2 ? 'L' : 'R'));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.stroke('L');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.stroke('R');
    });
  }

  private status() {
    this.setStatus(`${Math.floor(this.dist)} / ${GOAL}리`);
  }

  private stroke(side: 'L' | 'R') {
    if (!this.playing) return;
    if (side === this.last) {
      // 같은 쪽만 저으면 배가 돈다(벌칙 없음)
      this.vel = Math.max(0, this.vel - 0.2);
      this.tweens.add({ targets: this.boat, x: this.boat.x + (side === 'L' ? 3 : -3), duration: 120, yoyo: true });
      return;
    }
    this.last = side;
    this.vel = Math.min(1.4, this.vel + 0.28);
    Sfx.splash();
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const dt = delta / 1000;
    // 맞바람: 가만히 있으면 조금씩 밀린다.
    this.vel = Math.max(-0.3, this.vel - 1.2 * dt);
    this.dist = Math.max(0, this.dist + this.vel * dt);
    this.sea.tilePositionY -= this.vel * 30 * dt;
    this.sea.tilePositionX += 20 * dt;
    this.status();
    if (this.dist >= GOAL) {
      this.playing = false;
      this.complete();
    }
  }
}
