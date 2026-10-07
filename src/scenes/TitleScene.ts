import Phaser from 'phaser';
import { PAL, rgb } from '../art/palette.ts';
import { Scripture } from '../data/Scripture.ts';
import { Save } from '../state/save.ts';
import { FLOW } from '../story/flow.ts';
import { startStep } from '../story/progress.ts';
import { showSigns } from '../ui/SignsMenu.ts';
import { showSoundMenu } from '../ui/SoundMenu.ts';
import { Sfx } from '../audio/sfx.ts';
import { drawPanel } from '../ui/panel.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { bt, measurer, Tag } from '../ui/text.ts';

// 타이틀 두루마리 구절. 본문에는 "와 보라"로 되어 있다(data/SOURCE.md).
const TITLE_REF = 'john:4:28-29';
const SIGNS = '모은 표적';

/** 아래 조작판 보이기·숨기기. 게임 칸 크기가 바뀌므로 화면을 다시 맞춘다(main.ts refit). */
function showPad(on: boolean) {
  const had = document.body.classList.contains('on-title');
  document.body.classList.toggle('on-title', !on);
  if (had === on) window.dispatchEvent(new Event('resize'));
}

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
    // 첫 화면은 고르기만 하면 되므로 아래 조작판(방향 패드·확인·메뉴)을 숨기고 화면을 넓게 쓴다(사용자 요청 2026-10-05).
    showPad(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => showPad(true));
    const { width: W, height: H } = this.scale;
    const hasSave = Save.load(1) !== null && (Save.data.step > 0 || Save.data.chaptersDone.length > 0);
    // 메뉴 이름은 제목("일곱 표적")과 겹치지 않게 "모은 표적"
    const options = hasSave ? ['이어하기', '처음부터', SIGNS, '일기장', '소리 설정'] : ['시작하기', SIGNS, '소리 설정'];
    const L = this.layout(options.length);
    const seaTop = L.seaTop;

    // 해 질 녘의 하늘: 연하늘에서 수평선의 살구빛으로(파스텔, 사용자 요청 2026-10-04). 띠 경계는 디더링으로 섞는다.
    const sky = this.add.graphics();
    // 푸른 새벽: 짙은 남빛에서 수평선 쪽 옅은 살구빛으로 (어둠 속 빛)
    const bands = [0x2f3a5e, 0x37436a, 0x434f78, 0x5a6390, 0x8c84b4, 0xd9b9c2];
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
    // 먼 언덕 (밝은 하늘에서는 흰 별이 얼룩처럼 보여서 별은 두지 않는다)
    // 별과 샛별 하나
    const stars = this.add.graphics();
    for (let i = 0; i < 40; i++) stars.fillStyle(i % 4 ? PAL.mist : PAL.white).fillRect((i * 97) % W, (i * 41) % Math.max(10, Math.floor(seaTop * 0.6)), 1, 1);
    const star = this.add.graphics();
    const sx = Math.round(W * 0.78);
    const sy = Math.round(seaTop * 0.42);
    star.fillStyle(PAL.cream).fillRect(sx - 1, sy - 1, 3, 3);
    star.fillStyle(PAL.honey).fillRect(sx, sy - 3, 1, 7).fillRect(sx - 3, sy, 7, 1);
    this.tweens.add({ targets: star, alpha: 0.55, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const hills = this.add.graphics().fillStyle(0x3d4669);
    for (let x = 0; x < W; x += 2) hills.fillRect(x, seaTop - 6 - Math.round(4 + Math.sin(x / 23) * 3 + Math.sin(x / 7) * 1), 2, 12);
    // 움직이는 밤바다
    const sea = this.add.tileSprite(0, seaTop, W, H - seaTop, 'water').setOrigin(0).setTint(0x6f7aa6);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 4000, repeat: -1 });
    this.add.rectangle(0, seaTop, W, 1, 0xeec9b6).setOrigin(0).setAlpha(0.8);

    // 로고 → 부제는 가깝게, 부제 → 두루마리 칩은 조금 띄우고, 칩 → 메뉴는 더 넓게(묶음이 구분되게)
    // 로고 뒤 빛은 하늘을 하얗게 날리지 않게 작고 옅게
    this.add.image(W / 2, L.logoY, 'halo').setScale(1.8).setAlpha(0.14).setBlendMode(Phaser.BlendModes.ADD);
    outlinedText(this, W / 2, L.logoY, '일곱 표적', PAL.honey, 2);
    bt(this, W / 2, L.subY, '와서 보라', PAL.lavender, 'body').setOrigin(0.5);

    // 작은 두루마리 단추: 참조 표기만 보여주고, 누르면 본문 원문이 열린다. 메뉴 단추와 같은 모양이라 누를 수 있어 보인다.
    const chip = new Tag(this, W / 2, L.chipTop, `두루마리 펼치기 · ${Scripture.label(TITLE_REF)}`, {
      fg: PAL.ink,
      bg: PAL.white,
      border: PAL.teal,
      originX: 0.5,
      padX: 8,
      padY: 5,
    });

    let scrollOpen = false;
    chip.on('pointerdown', async (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      if (scrollOpen) return;
      scrollOpen = true;
      await openScroll(this, [TITLE_REF]);
      scrollOpen = false;
    });

    // "화면을 눌러 시작" 없이 바로 메뉴를 보여 준다(사용자 요청 2026-10-04). 메뉴를 누르는 것이 첫 터치가 된다.
    let pick = options[await this.menu(options, L.menuTop, L.bh, L.gap)];
    while (pick === SIGNS || pick === '소리 설정') {
      if (pick === SIGNS) await showSigns(this);
      else await showSoundMenu(this);
      pick = options[await this.menu(options, L.menuTop, L.bh, L.gap, options.indexOf(pick))];
    }
    if (pick === '일기장') return this.scene.start('Diary');
    if (pick === '이어하기') return startStep(this, Math.min(Save.data.step, FLOW.length - 1));
    Save.startNew(1);
    this.cameras.main.fadeOut(400, ...rgb(PAL.ink));
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
    // 세로 화면처럼 여유가 있으면 위아래로 나눈다: 하늘에는 로고·부제·두루마리, 바다에는 메뉴 단추(사용자 요청 2026-10-05)
    const headH = logoH + gaps[0] + subH + gaps[1] + chipH;
    const menuH = buttons * bh + (buttons - 1) * gap;
    const seaTop = Math.floor(H * 0.58);
    if (seaTop - headH >= 40 && H - seaTop - menuH >= 40) {
      const top = Math.round((seaTop - 10 - headH) * 0.5);
      const logoY = top + logoH / 2;
      const subY = top + logoH + gaps[0] + subH / 2;
      const chipTop = top + logoH + gaps[0] + subH + gaps[1];
      const menuTop = seaTop + Math.round((H - seaTop - menuH) * 0.42);
      return { logoY, subY, chipTop, menuTop, bh, gap, seaTop };
    }
    // 가로처럼 낮은 화면: 한 묶음으로 가운데(살짝 위)에 쌓는다
    const total = fixed() + gaps.reduce((a, b) => a + b, 0);
    const top = Math.max(12, Math.round((H - total) * 0.45));
    const logoY = top + logoH / 2;
    const subY = top + logoH + gaps[0] + subH / 2;
    const chipTop = top + logoH + gaps[0] + subH + gaps[1];
    const menuTop = chipTop + chipH + gaps[2];
    // 단추가 언덕 줄에 걸치지 않게 바다를 단추 바로 위에서 시작한다
    return { logoY, subY, chipTop, menuTop, bh, gap, seaTop: Math.min(Math.floor(H * 0.72), menuTop - 10) };
  }

  /** 세로로 쌓인 큰 버튼 메뉴. 방향키·확인 버튼·터치 모두 된다. */
  private menu(options: string[], top: number, bh = 22, gap = 8, start = 0): Promise<number> {
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
    let sel = Math.max(0, start);
    const paint = () =>
      buttons.forEach((b, i) => {
        b.g.clear();
        drawPanel(b.g, x, b.y, bw, bh, i === sel ? 'softOn' : 'soft');
        b.text.setTint(i === sel ? PAL.ink : PAL.night);
      });
    paint();
    return new Promise((resolve) => {
      const finish = (i: number) => {
        this.input.keyboard?.off('keydown', onKey);
        sel = i;
        paint();
        Sfx.select();
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
        else return;
        Sfx.move();
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
