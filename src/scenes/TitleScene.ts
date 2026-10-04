import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { FLOW } from '../story/flow.ts';
import { startStep } from '../story/progress.ts';
import { showSigns } from '../ui/SignsMenu.ts';
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
    const seaTop = Math.floor(H * 0.72);
    const hasSave = Save.load(1) !== null && (Save.data.step > 0 || Save.data.chaptersDone.length > 0);
    const options = hasSave ? ['이어하기', '처음부터', '일곱 표적', '일기장'] : ['시작하기', '일곱 표적'];
    const L = this.layout(options.length);

    // 해 질 녘의 하늘: 연하늘에서 수평선의 살구빛으로(파스텔, 사용자 요청 2026-10-04). 띠 경계는 디더링으로 섞는다.
    const sky = this.add.graphics();
    const bands = [PAL.skyLight, PAL.skyLight, PAL.sky, PAL.lilac, PAL.lavender, PAL.peach];
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
      const star = this.add.rectangle((i * 83) % W, (i * 37) % Math.floor(seaTop * 0.6), 1, 1, PAL.white);
      this.tweens.add({ targets: star, alpha: 0.15, duration: 700 + (i % 5) * 300, yoyo: true, repeat: -1, delay: (i * 97) % 900 });
    }
    // 먼 언덕
    const hills = this.add.graphics().fillStyle(PAL.mauve);
    for (let x = 0; x < W; x += 2) hills.fillRect(x, seaTop - 6 - Math.round(4 + Math.sin(x / 23) * 3 + Math.sin(x / 7) * 1), 2, 12);
    // 움직이는 밤바다
    const sea = this.add.tileSprite(0, seaTop, W, H - seaTop, 'water').setOrigin(0).setTint(PAL.navy);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 4000, repeat: -1 });
    this.add.rectangle(0, seaTop, W, 1, PAL.lilac).setOrigin(0).setAlpha(0.7);

    // 로고 → 부제는 가깝게, 부제 → 두루마리 칩은 조금 띄우고, 칩 → 메뉴는 더 넓게(묶음이 구분되게)
    this.add.image(W / 2, L.logoY, 'halo').setScale(2.6).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    outlinedText(this, W / 2, L.logoY, '일곱 표적', PAL.honey, 2);
    bt(this, W / 2, L.subY, '와서 보라', PAL.night, 'body').setOrigin(0.5);

    // 작은 두루마리 칩: 참조 표기만 보여주고, 누르면 본문 원문이 열린다.
    const chip = new Tag(this, W / 2, L.chipTop, `두루마리 · ${Scripture.label(TITLE_REF)}`, {
      fg: PAL.ink,
      bg: PAL.cream,
      border: PAL.rust,
      originX: 0.5,
      padX: 8,
      padY: 5,
    });

    const prompt = bt(this, W / 2, L.promptY, '화면을 눌러 시작', PAL.ink).setOrigin(0.5);
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

    let pick = options[await this.menu(options, L.menuTop, L.bh, L.gap)];
    while (pick === '일곱 표적') {
      await showSigns(this);
      pick = options[await this.menu(options, L.menuTop, L.bh, L.gap)];
    }
    if (pick === '일기장') return this.scene.start('Diary');
    if (pick === '이어하기') return startStep(this, Math.min(Save.data.step, FLOW.length - 1));
    Save.startNew(1);
    this.cameras.main.fadeOut(400, 46, 34, 47);
    this.cameras.main.once('camerafadeoutcomplete', () => startStep(this, 0));
  }

  /**
   * 세로 배치. 8칸 단위 간격으로 로고·부제·칩·메뉴를 묶고, 묶음 전체를 화면 세로 가운데(살짝 위)에 둔다.
   * 세로가 짧은 화면에서는 간격을 비율대로 줄인다.
   */
  private layout(buttons: number) {
    const H = this.scale.height;
    const logoH = 22;
    const subH = 11;
    const chipH = 19;
    let bh = 22;
    let gap = 8;
    let gaps = [10, 16, 24];
    const fixed = () => logoH + subH + chipH + buttons * bh + (buttons - 1) * gap;
    const avail = H - 24;
    const want = fixed() + gaps.reduce((a, b) => a + b, 0);
    if (want > avail) {
      bh = 20;
      gap = 5;
      const k = Math.max(0.35, (avail - fixed()) / gaps.reduce((a, b) => a + b, 0));
      gaps = gaps.map((g) => Math.round(g * k));
    }
    const total = fixed() + gaps.reduce((a, b) => a + b, 0);
    const top = Math.max(12, Math.round((H - total) * 0.45));
    const logoY = top + logoH / 2;
    const subY = top + logoH + gaps[0] + subH / 2;
    const chipTop = top + logoH + gaps[0] + subH + gaps[1];
    const menuTop = chipTop + chipH + gaps[2];
    const menuH = buttons * bh + (buttons - 1) * gap;
    return { logoY, subY, chipTop, menuTop, bh, gap, promptY: Math.round(menuTop + menuH / 2) };
  }

  /** 세로로 쌓인 큰 버튼 메뉴. 방향키·확인 버튼·터치 모두 된다. */
  private menu(options: string[], top: number, bh = 22, gap = 8): Promise<number> {
    const { width: W } = this.scale;
    const measure = measurer('ui');
    const bw = Math.min(W - 32, Math.max(128, ...options.map((o) => measure(o) + 48)));
    const x = Math.round((W - bw) / 2);
    const group = this.add.container(0, 0);
    const buttons = options.map((label, i) => {
      const y = top + i * (bh + gap);
      const g = this.add.graphics();
      // 한글 글리프(9px)는 글자 상자 위에서 2px 아래에 있다. 버튼 안쪽(그림자 제외) 세로 가운데에 맞춘다.
      const text = bt(this, W / 2, y + Math.floor((bh - 9) / 2) - 2, label, PAL.white).setOrigin(0.5, 0);
      const hit = this.add.zone(x, y, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true });
      group.add([g, text, hit]);
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
        this.tweens.add({
          targets: buttons[i].text,
          alpha: 0.3,
          duration: 60,
          yoyo: true,
          repeat: 1,
          onComplete: () => (group.destroy(), resolve(i)),
        });
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
