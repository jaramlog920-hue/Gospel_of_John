// 1장 「태초에 말씀이」: 빛 퍼즐. 거울을 돌려 빛줄기를 꺾고 꺼진 등잔을 밝힌다.
// 화면은 흑백으로 시작해서 단계를 풀 때마다 색이 돌아오고, 마지막에 온 색이 한 번에 펼쳐진다.
// 본문은 1:1–18(서문)을 끊지 않고 단계마다 이어서 보여준다.
import Phaser from 'phaser';
import { PAL, rgb } from '../art/palette.ts';
import { LEVELS, parseLevel, toggleMirror, traceBeam, type Cell } from '../minigames/lightBeam.ts';
import { Save } from '../state/save.ts';
import { Controls } from '../ui/Controls.ts';
import { say, titleCard } from '../ui/Dialog.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { Tag } from '../ui/text.ts';

const TILE = 16;
const INTRO_REF = 'john:1:1-3';
/** 단계를 풀 때마다 이어지는 본문. INTRO_REF와 합치면 1:1–18 전체 */
const LEVEL_REFS = ['john:1:4-5', 'john:1:6-9', 'john:1:10-18'];

interface Ch1Data {
  level?: number;
}

export class Ch1LightScene extends Phaser.Scene {
  private controls!: Controls;
  private level = 0;
  private ox = 0;
  private oy = 0;
  private grid: Cell[][] = [];
  private tiles: Phaser.GameObjects.Image[] = [];
  private beam!: Phaser.GameObjects.Graphics;
  private halos: Phaser.GameObjects.Image[] = [];
  private status!: Tag;
  private gray = { amount: 1 };
  private colorMatrix?: Phaser.FX.ColorMatrix;
  /** 흑백 효과는 퍼즐 판에만 준다. 두루마리와 대화 상자는 제 색을 유지한다. */
  private world!: Phaser.GameObjects.Container;
  private solving = false;

  constructor() {
    super('Ch1');
  }

  /** 화면을 돌려 다시 그릴 때 지금 단계부터 이어서 한다. */
  checkpoint() {
    return { level: this.level };
  }

  async create(data: Ch1Data) {
    const { width: W, height: H } = this.scale;
    const resumed = (data?.level ?? 0) > 0;
    this.level = data?.level ?? 0;
    this.solving = false;
    this.tiles = [];
    this.halos = [];
    this.gray.amount = 1 - this.level / LEVELS.length;
    this.controls = new Controls(this);
    this.cameras.main.setBackgroundColor(PAL.ink);
    this.world = this.add.container(0, 0);
    this.colorMatrix = this.world.postFX?.addColorMatrix();
    this.applyGray();

    const cols = LEVELS[0][0].length;
    const rows = LEVELS[0].length;
    this.ox = Math.floor((W - cols * TILE) / 2);
    this.oy = Math.floor((H - rows * TILE) / 2);
    const sea = this.add.tileSprite(0, H - 16, W, 16, 'water').setOrigin(0);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 4000, repeat: -1 });
    this.world.add(sea);
    this.beam = this.add.graphics().setDepth(5);
    this.world.add(this.beam);
    this.status = new Tag(this, W / 2, this.oy - 22, ' ', { fg: PAL.mist, bg: PAL.night, border: PAL.indigo, originX: 0.5 });

    if (!resumed) {
      await titleCard(this, '1장 · 태초에 말씀이', '갈릴리 바닷가, 캄캄한 밤');
      this.buildLevel();
      await this.controls.modal(async () => {
        await say(this, '나', '캄캄한 밤이다. 바닷가 마을엔 불빛 하나 없다. 모래밭에 두루마리 하나가 떨어져 있다.');
        await openScroll(this, [INTRO_REF]);
        await say(
          this,
          '나',
          '저 멀리서 가느다란 빛줄기가 새어 들어온다. 거울을 눌러 돌리면 빛이 꺾일 것 같다.',
          '꺼진 등잔에 빛이 닿게 해 보자.',
        );
      });
      Save.addVerses([INTRO_REF]);
    } else {
      this.buildLevel();
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.controls.busy || this.solving) return;
      const gx = Math.floor((p.x - this.ox) / TILE);
      const gy = Math.floor((p.y - this.oy) / TILE);
      if (toggleMirror(this.grid, gx, gy)) this.onChanged(gx, gy);
    });
  }

  private applyGray() {
    this.colorMatrix?.reset();
    this.colorMatrix?.grayscale(this.gray.amount);
  }

  private buildLevel() {
    this.tiles.forEach((t) => t.destroy());
    this.halos.forEach((h) => h.destroy());
    this.tiles = [];
    this.halos = [];
    this.grid = parseLevel(LEVELS[this.level]);
    this.grid.forEach((row, y) =>
      row.forEach((c, x) => {
        const px = this.ox + x * TILE;
        const py = this.oy + y * TILE;
        this.tiles.push(this.add.image(px, py, c === '#' ? 'tile-wall' : 'tile-floor').setOrigin(0));
        const top = this.tileFor(c);
        if (top) this.tiles.push(this.add.image(px, py, top).setOrigin(0).setDepth(6).setName(`${x},${y}`));
      }),
    );
    this.world.add(this.tiles);
    this.world.sort('depth');
    this.status.setLabel(`빛 퍼즐 ${this.level + 1}/${LEVELS.length} · 거울을 눌러 돌리기`);
    this.redraw();
  }

  private tileFor(c: Cell): string | null {
    if (c === '/') return 'mirror-slash';
    if (c === '\\') return 'mirror-back';
    if (c === 'T') return 'lamp-off';
    if ('<>^v'.includes(c)) return 'emitter';
    return null;
  }

  private redraw() {
    const result = traceBeam(this.grid);
    this.beam.clear();
    const pts = result.path.map((p) => ({ x: this.ox + p.x * TILE + 8, y: this.oy + p.y * TILE + 8 }));
    for (const [w, color, alpha] of [
      [5, PAL.orange, 0.35],
      [2, PAL.gold, 1],
      [1, PAL.white, 1],
    ] as const) {
      this.beam.lineStyle(w, color, alpha);
      this.beam.beginPath();
      pts.forEach((p, i) => (i === 0 ? this.beam.moveTo(p.x, p.y) : this.beam.lineTo(p.x, p.y)));
      this.beam.strokePath();
    }
    for (const t of this.tiles) {
      if (t.texture.key.startsWith('lamp')) t.setTexture(result.lit.has(t.name) ? 'lamp-on' : 'lamp-off');
    }
    return result;
  }

  private async onChanged(gx: number, gy: number) {
    const tile = this.tiles.find((t) => t.name === `${gx},${gy}`);
    tile?.setTexture(this.grid[gy][gx] === '/' ? 'mirror-slash' : 'mirror-back');
    if (tile) this.tweens.add({ targets: tile, scale: { from: 1.15, to: 1 }, duration: 120 });
    const result = this.redraw();
    if (!result.solved) return;

    this.solving = true;
    for (const key of result.lit) {
      const [x, y] = key.split(',').map(Number);
      const h = this.add
        .image(this.ox + x * TILE + 8, this.oy + y * TILE + 4, 'halo')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(7)
        .setAlpha(0);
      this.tweens.add({ targets: h, alpha: 0.8, duration: 400 });
      this.halos.push(h);
      this.world.add(h);
    }
    this.world.sort('depth');
    const last = this.level === LEVELS.length - 1;
    const target = last ? 0 : 1 - (this.level + 1) / LEVELS.length;
    await new Promise<void>((resolve) =>
      this.tweens.add({
        targets: this.gray,
        amount: target,
        duration: last ? 900 : 700,
        delay: 300,
        onUpdate: () => this.applyGray(),
        onComplete: () => resolve(),
      }),
    );
    if (last) this.cameras.main.flash(500, ...rgb(PAL.cream));

    const ref = LEVEL_REFS[this.level];
    await this.controls.modal(async () => {
      if (last) await say(this, '나', '마을이 제 색을 되찾았다. 두루마리의 다음 줄을 마저 읽는다.');
      await openScroll(this, [ref]);
    });
    Save.addVerses([ref]);

    if (last) {
      this.cameras.main.fadeOut(600, ...rgb(PAL.ink));
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Campfire', { ch: 1, next: 'Ch6', flags: {} }));
      return;
    }
    this.level++;
    this.time.delayedCall(300, () => {
      this.buildLevel();
      this.solving = false;
    });
  }
}
