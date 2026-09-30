import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { FLOW } from '../story/flow.ts';
import { startStep } from '../story/progress.ts';
import { drawPanel } from '../ui/panel.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { bt, measurer, Tag, waitPress } from '../ui/text.ts';

// 타이틀 두루마리 구절. 본문에는 "와 보라"로 되어 있다(data/SOURCE.md).
const TITLE_REF = 'john:4:28-29';

/** 1px 외곽선을 두른 비트맵 글자(흐림 없는 도트 로고). 그림자 대신 외곽선만 쓴다. */
function outlinedText(scene: Phaser.Scene, x: number, y: number, text: string, fill: number, scale: number) {
  const c = scene.add.container(x, y);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if (dx || dy) c.add(bt(scene, dx, dy, text, PAL.ink, 'body').setOrigin(0.5).setScale(scale));
  c.add(bt(scene, 0, 0, text, fill, 'body').setOrigin(0.5).setScale(scale));
  return c;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  async create() {
    const { width: W, height: H } = this.scale;
    const cy = Math.floor(H * 0.34);
    const seaTop = Math.floor(H * 0.72);

    // 해 진 뒤의 하늘: 남색에서 수평선의 자주빛으로. 띠 경계는 디더링으로 섞는다.
    const sky = this.add.graphics();
    const bands = [PAL.dusk, PAL.dusk, PAL.dusk, PAL.indigo, PAL.grape, PAL.purple];
    const bandH = Math.ceil(seaTop / bands.length);
    bands.forEach((c, i) => sky.fillStyle(c).fillRect(0, i * bandH, W, bandH));
    bands.forEach((c, i) => {
      if (i === 0 || c === bands[i - 1]) return;
      sky.fillStyle(c);
      for (let row = 1; row <= 3; row++)
        for (let x = (row % 2) * 2; x < W; x += 2 + row * 2) sky.fillRect(x, i * bandH - row, 1, 1);
      sky.fillStyle(bands[i - 1]);
      for (let x = 1; x < W; x += 4) sky.fillRect(x, i * bandH, 1, 1);
    });
    for (let i = 0; i < 46; i++) {
      const star = this.add.rectangle((i * 83) % W, (i * 37) % Math.floor(seaTop * 0.6), 1, 1, i % 7 === 0 ? PAL.honey : PAL.white);
      this.tweens.add({ targets: star, alpha: 0.15, duration: 700 + (i % 5) * 300, yoyo: true, repeat: -1, delay: (i * 97) % 900 });
    }
    // 먼 언덕
    const hills = this.add.graphics().fillStyle(PAL.plum);
    for (let x = 0; x < W; x += 2) hills.fillRect(x, seaTop - 6 - Math.round(4 + Math.sin(x / 23) * 3 + Math.sin(x / 7) * 1), 2, 12);
    // 움직이는 밤바다
    const sea = this.add.tileSprite(0, seaTop, W, H - seaTop, 'water').setOrigin(0).setTint(PAL.indigo);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 4000, repeat: -1 });
    this.add.rectangle(0, seaTop, W, 1, PAL.lilac).setOrigin(0).setAlpha(0.7);

    this.add.image(W / 2, cy, 'halo').setScale(2.6).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    outlinedText(this, W / 2, cy - 8, '일곱 표적', PAL.honey, 2);
    bt(this, W / 2, cy + 18, '와서 보라', PAL.cream, 'body').setOrigin(0.5);

    // 작은 두루마리 칩: 참조 표기만 보여주고, 누르면 본문 원문이 열린다.
    const chip = new Tag(this, W / 2, cy + 36, `두루마리 · ${Scripture.label(TITLE_REF)}`, {
      fg: PAL.ink,
      bg: PAL.cream,
      border: PAL.rust,
      originX: 0.5,
      padY: 4,
    });

    const prompt = bt(this, W / 2, Math.floor((cy + 60 + seaTop) / 2), '화면을 눌러 시작', PAL.white).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });

    let scrollOpen = false;
    chip.on('pointerdown', async (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      if (scrollOpen) return;
      scrollOpen = true;
      await openScroll(this, [TITLE_REF]);
      scrollOpen = false;
    });

    // 첫 터치 뒤에 오디오를 켤 수 있다(브라우저 정책).
    do await waitPress(this);
    while (scrollOpen);
    prompt.destroy();

    const hasSave = Save.load(1) !== null && (Save.data.step > 0 || Save.data.chaptersDone.length > 0);
    const options = hasSave ? ['이어하기', '처음부터', '일기장'] : ['시작하기'];
    const pick = options[await this.menu(options, cy + 58)];
    if (pick === '일기장') return this.scene.start('Diary');
    if (pick === '이어하기') return startStep(this, Math.min(Save.data.step, FLOW.length - 1));
    Save.startNew(1);
    this.cameras.main.fadeOut(400, 46, 34, 47);
    this.cameras.main.once('camerafadeoutcomplete', () => startStep(this, 0));
  }

  /** 세로로 쌓인 큰 버튼 메뉴. 방향키·확인 버튼·터치 모두 된다. */
  private menu(options: string[], top: number): Promise<number> {
    const { width: W } = this.scale;
    const measure = measurer('ui');
    const bw = Math.max(96, ...options.map((o) => measure(o) + 36));
    const bh = 18;
    const gap = 5;
    const x = Math.round((W - bw) / 2);
    const buttons = options.map((label, i) => {
      const y = top + i * (bh + gap);
      const g = this.add.graphics();
      // 한글 글리프(9px)는 글자 상자 위에서 2px 아래에 있다. 버튼 안쪽(그림자 제외) 세로 가운데에 맞춘다.
      const text = bt(this, W / 2, y + Math.floor((bh - 9) / 2) - 2, label, PAL.white).setOrigin(0.5, 0);
      const hit = this.add.zone(x, y, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true });
      return { g, text, hit, y };
    });
    let sel = 0;
    const paint = () =>
      buttons.forEach((b, i) => {
        b.g.clear();
        drawPanel(b.g, x, b.y, bw, bh, i === sel ? 'accent' : 'dark');
        b.text.setTint(i === sel ? PAL.white : PAL.steel);
      });
    paint();
    return new Promise((resolve) => {
      const finish = (i: number) => {
        this.input.keyboard?.off('keydown', onKey);
        sel = i;
        paint();
        this.tweens.add({ targets: buttons[i].text, alpha: 0.3, duration: 60, yoyo: true, repeat: 1, onComplete: () => resolve(i) });
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.code === 'ArrowUp') sel = (sel + options.length - 1) % options.length;
        else if (e.code === 'ArrowDown') sel = (sel + 1) % options.length;
        else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') return finish(sel);
        paint();
      };
      this.time.delayedCall(150, () => {
        this.input.keyboard?.on('keydown', onKey);
        buttons.forEach((b, i) => {
          b.hit.on('pointerover', () => ((sel = i), paint()));
          b.hit.on('pointerdown', () => finish(i));
        });
      });
    });
  }
}
