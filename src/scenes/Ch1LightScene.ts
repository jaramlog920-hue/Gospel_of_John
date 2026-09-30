// 1장 「태초에 말씀이」: 빛 퍼즐. 거울을 돌려 빛줄기를 꺾고 꺼진 등잔을 밝힌다.
// 화면은 흑백으로 시작해서 단계를 풀 때마다 색이 돌아오고, 마지막에 32색이 한 번에 펼쳐진다.
import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { LEVELS, parseLevel, toggleMirror, traceBeam, type Cell } from '../minigames/lightBeam.ts';
import { Save } from '../state/save.ts';
import { Controls } from '../ui/Controls.ts';
import { say, titleCard } from '../ui/Dialog.ts';
import { FONT_UI, GAME_WIDTH } from '../ui/layout.ts';
import { openScroll } from '../ui/ScrollFrame.ts';

const TILE = 16;
const OX = 64;
const OY = 44;
const REFS = ['john:1:1-5'];

export class Ch1LightScene extends Phaser.Scene {
  private controls!: Controls;
  private level = 0;
  private grid: Cell[][] = [];
  private tiles: Phaser.GameObjects.Image[] = [];
  private beam!: Phaser.GameObjects.Graphics;
  private halos: Phaser.GameObjects.Image[] = [];
  private status!: Phaser.GameObjects.Text;
  private gray = { amount: 1 };
  private colorMatrix?: Phaser.FX.ColorMatrix;
  private solving = false;

  constructor() {
    super('Ch1');
  }

  async create() {
    this.level = 0;
    this.solving = false;
    this.gray.amount = 1;
    this.controls = new Controls(this);
    this.cameras.main.setBackgroundColor(PAL.ink);
    this.colorMatrix = this.cameras.main.postFX?.addColorMatrix();
    this.applyGray();

    for (let x = 0; x < GAME_WIDTH; x += 16) this.add.image(x, 164, 'water').setOrigin(0).setAlpha(0.8);
    this.beam = this.add.graphics().setDepth(5);
    this.status = this.add.text(GAME_WIDTH / 2, 20, '', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.mist) }).setOrigin(0.5);

    await titleCard(this, '1장 · 태초에 말씀이', '갈릴리 바닷가, 캄캄한 밤');
    this.buildLevel();
    await this.controls.modal(() =>
      say(
        this,
        '나',
        '캄캄한 밤이다. 바닷가 마을엔 불빛 하나 없다.',
        '저 멀리서 가느다란 빛줄기가 새어 들어온다. 거울을 눌러 돌리면 빛이 꺾일 것 같다.',
        '꺼진 등잔에 빛이 닿게 해 보자.',
      ),
    );

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.controls.busy || this.solving) return;
      const gx = Math.floor((p.x - OX) / TILE);
      const gy = Math.floor((p.y - OY) / TILE);
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
        const px = OX + x * TILE;
        const py = OY + y * TILE;
        this.tiles.push(this.add.image(px, py, c === '#' ? 'tile-wall' : 'tile-floor').setOrigin(0));
        const top = this.tileFor(c);
        if (top) this.tiles.push(this.add.image(px, py, top).setOrigin(0).setDepth(6).setName(`${x},${y}`));
      }),
    );
    this.status.setText(`빛 퍼즐 ${this.level + 1}/${LEVELS.length} · 거울을 눌러 돌리기`);
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
    const pts = result.path.map((p) => ({ x: OX + p.x * TILE + 8, y: OY + p.y * TILE + 8 }));
    for (const [w, color, alpha] of [
      [5, PAL.amber, 0.35],
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
      const h = this.add.image(OX + x * TILE + 8, OY + y * TILE + 4, 'halo').setBlendMode(Phaser.BlendModes.ADD).setDepth(7).setAlpha(0);
      this.tweens.add({ targets: h, alpha: 0.8, duration: 400 });
      this.halos.push(h);
    }
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
    if (last) {
      this.cameras.main.flash(500, 255, 244, 214);
      await this.finish();
      return;
    }
    this.level++;
    this.time.delayedCall(500, () => {
      this.buildLevel();
      this.solving = false;
    });
  }

  private async finish() {
    await this.controls.modal(async () => {
      await say(this, '나', '마을이 제 색을 되찾았다. 바닷가에 누가 두고 간 두루마리가 있다.');
      await openScroll(this, REFS);
    });
    Save.addVerses(REFS);
    this.cameras.main.fadeOut(600, 26, 20, 35);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Campfire', { ch: 1, next: 'Ch6', flags: {} }));
  }
}
