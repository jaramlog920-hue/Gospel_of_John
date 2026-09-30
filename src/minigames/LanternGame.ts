// 3장 밤: 등불 하나에 의지해 어두운 골목을 지나 불 켜진 집을 찾아간다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { Sfx } from '../audio/sfx.ts';
import { MiniGame } from './MiniGame.ts';

const T = 16;
// '#' 집 벽, '.' 골목, 'G' 불 켜진 집 문
const MAP = [
  '###################',
  '#.....#.......#...#',
  '#.###.#.#####.#.#.#',
  '#.#...#.#...#...#.#',
  '#.#.###.#.#.#####.#',
  '#.#.....#.#.....#G#',
  '#.#######.#####.#.#',
  '#.........#.......#',
  '###################',
];

export class LanternGame extends MiniGame {
  readonly title = '등불 하나';
  readonly howTo = '밤이 깊어 골목이 캄캄하다. 등불이 비추는 곳만 보인다. 멀리 새어 나오는 불빛을 따라 그 집을 찾아가자.';

  private player!: Phaser.GameObjects.Sprite;
  private dark!: Phaser.GameObjects.Image;
  private goalGlow!: Phaser.GameObjects.Image;
  private goal = { x: 0, y: 0 };
  private playing = false;

  constructor() {
    super('Lantern');
  }

  private wall(x: number, y: number) {
    const c = MAP[Math.floor(y / T)]?.[Math.floor(x / T)];
    return c === undefined || c === '#';
  }

  protected build() {
    this.playing = false;
    const worldW = MAP[0].length * T;
    const worldH = MAP.length * T;
    MAP.forEach((row, y) =>
      [...row].forEach((c, x) => {
        this.add.image(x * T, y * T, c === '#' ? 'tile-wall' : 'paving').setOrigin(0).setTint(c === '#' ? 0xffffff : PAL.steel);
        if (c === 'G') {
          this.goal = { x: x * T + 8, y: y * T + 8 };
          this.add.image(this.goal.x, this.goal.y, 'lamp-on');
        }
      }),
    );
    this.player = this.add.sprite(T * 1.5, T * 1.5, 'player', 0);
    this.cameras.main.setBounds(0, 0, Math.max(worldW, this.W), Math.max(worldH, this.H)).startFollow(this.player, true, 1, 1);
    // 어둠: 가운데만 뚫린 큰 그림을 주인공 둘레에 따라다니게 한다.
    const key = `lantern-dark-${this.W}x${this.H}`;
    if (!this.textures.exists(key)) {
      const w = this.W * 2 + 64;
      const h = this.H * 2 + 64;
      const tex = this.textures.createCanvas(key, w, h)!;
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(w / 2, h / 2, 18, w / 2, h / 2, 44);
      g.addColorStop(0, 'rgba(46,34,47,0)');
      g.addColorStop(1, 'rgba(46,34,47,0.95)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      tex.refresh();
    }
    this.dark = this.add.image(this.player.x, this.player.y, key).setDepth(500);
    // 멀리서도 보이는 집 불빛(어둠 위에 더한다)
    this.goalGlow = this.add.image(this.goal.x, this.goal.y - 4, 'halo').setScale(0.9).setBlendMode(Phaser.BlendModes.ADD).setDepth(501);
    this.tweens.add({ targets: this.goalGlow, scale: 0.75, duration: 700, yoyo: true, repeat: -1 });
  }

  protected begin() {
    this.playing = true;
    this.setStatus('불 켜진 집을 찾아가자');
  }

  update(_t: number, delta: number) {
    this.dark.setPosition(Math.round(this.player.x), Math.round(this.player.y - 4));
    if (!this.playing) return;

    const p = this.player;
    const v = this.controls.move(p);
    const step = 55 * (delta / 1000);
    const nx = p.x + v.x * step;
    const ny = p.y + v.y * step;
    const r = 5;
    if (!this.wall(nx + Math.sign(v.x) * r, p.y - 2) && !this.wall(nx + Math.sign(v.x) * r, p.y + 4)) p.x = nx;
    if (!this.wall(p.x - 3, ny + Math.sign(v.y) * r) && !this.wall(p.x + 3, ny + Math.sign(v.y) * r)) p.y = ny;
    faceAndWalk(p, 'player', v.x, v.y);
    if (v.lengthSq() > 0 && Math.random() < 0.05) Sfx.step();
    if (Phaser.Math.Distance.Between(p.x, p.y, this.goal.x, this.goal.y) < 12) {
      this.playing = false;
      faceAndWalk(p, 'player', 0, 0);
      this.complete();
    }
  }
}
