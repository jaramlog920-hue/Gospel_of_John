// 6장 「오병이어」: 걷기(배고픔 게이지·무화과 나누기) → 도시락 든 아이 찾기 → 배급 러시 → 남은 조각 열두 바구니.
// 예수님과 성경 인물은 말하지 않는다. 사건은 두루마리 본문으로 보여주고, 대화는 가상 인물만 한다(설계 원칙 3·5).
// 본문은 6:1–15를 끊지 않고 장면 흐름에 맞춰 이어서 보여준다.
import Phaser from 'phaser';
import { PAL, rgb } from '../art/palette.ts';
import { faceAndWalk, faceTo, grassTile } from '../art/textures.ts';
import { Save } from '../state/save.ts';
import { Controls } from '../ui/Controls.ts';
import { choose, say, titleCard } from '../ui/Dialog.ts';
import { menuButtonInset } from '../ui/layout.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { drawPanel } from '../ui/panel.ts';
import { bt, DEPTH_UI, measurer, Tag } from '../ui/text.ts';
import { wrapWords } from '../ui/wrap.ts';

const WALK_W = 1280;
const ARENA_X = WALK_W; // 배급 구역은 걷기 구역 오른쪽에 붙인다
const BASE_SPEED = 72;
const DELIVERY_GOAL = 30;
const CARRY = 3;
const CRUMBS_PER_BASKET = 5;
const BASKETS = 12;

/** 장면별 본문. 합치면 6:1–15 전체 */
const REF = {
  intro: 'john:6:1-4',
  lunch: 'john:6:5-9',
  sit: 'john:6:10-11',
  gather: 'john:6:12',
  end: 'john:6:13-15',
};

type Phase = 'walk' | 'rush' | 'gather' | 'done';
type Food = 'bread' | 'fish';

interface Ch6Data {
  checkpoint?: 'rush' | 'gather';
  sharedFigs?: boolean;
}

interface Talker {
  sprite: Phaser.GameObjects.Sprite;
  talk: () => Promise<void>;
}

interface Group {
  sprites: Phaser.GameObjects.Image[];
  x: number;
  y: number;
  want: Food | null;
  bubble: Phaser.GameObjects.Container;
  cooldown: number;
}

function isPortraitScreen() {
  return window.matchMedia('(orientation: portrait)').matches;
}

export class Ch6FeedingScene extends Phaser.Scene {
  private controls!: Controls;
  private player!: Phaser.GameObjects.Sprite;
  private phase: Phase = 'walk';
  private W = 320;
  private H = 180;
  private groundTop = 70;
  private yMin = 78;
  private yMax = 168;
  private hunger = 100;
  private figs = 3;
  private sharedFigs = false;
  private talkers: Talker[] = [];
  private vignette!: Phaser.GameObjects.Image;
  private hungerBar!: Phaser.GameObjects.Rectangle;
  private figText!: Phaser.GameObjects.BitmapText;
  private goalText!: Tag;
  private hint!: Tag;
  private lastX = 0;

  // 배급 러시
  private carrying: { food: Food; count: number } | null = null;
  private carryIcon!: Phaser.GameObjects.Container;
  private stations: { food: Food; x: number; y: number }[] = [];
  private stationArrow?: Phaser.GameObjects.Triangle;
  private groups: Group[] = [];
  private delivered = 0;
  private helper?: Phaser.GameObjects.Sprite;
  private helperBusy = false;

  // 남은 조각
  private crumbs: Phaser.GameObjects.Image[] = [];
  private crumbCount = 0;
  private basketIcons: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Ch6');
  }

  /** 화면을 돌려 다시 그릴 때 배급·거두기 단계부터 이어서 한다. */
  checkpoint(): Ch6Data {
    const checkpoint = this.phase === 'gather' || this.delivered >= DELIVERY_GOAL ? 'gather' : this.phase === 'rush' ? 'rush' : undefined;
    return { checkpoint, sharedFigs: this.sharedFigs };
  }

  async create(data: Ch6Data) {
    Object.assign(this, {
      phase: 'walk',
      hunger: 100,
      figs: data?.sharedFigs ? 1 : 3,
      sharedFigs: data?.sharedFigs ?? false,
      talkers: [],
      carrying: null,
      stations: [],
      stationArrow: undefined,
      groups: [],
      delivered: 0,
      helper: undefined,
      helperBusy: false,
      crumbs: [],
      crumbCount: 0,
      basketIcons: [],
    });
    this.W = this.scale.width;
    this.H = this.scale.height;
    // 세로 화면에서는 하늘을 줄이고 걷는 땅을 넓힌다.
    this.groundTop = Math.floor(this.H * (this.H > this.W ? 0.3 : 0.4));
    this.yMin = this.groundTop + 10;
    this.yMax = this.H - 10;

    this.controls = new Controls(this);
    this.cameras.main.setBackgroundColor(PAL.sky);
    this.buildWorld();

    this.player = this.add.sprite(40, this.yAt(0.55), 'player', 0);
    this.lastX = this.player.x;
    this.carryIcon = this.add.container(0, 0).setDepth(900).setVisible(false);
    this.cameras.main.setBounds(0, 0, WALK_W, this.H).startFollow(this.player, true, 0.15, 0.15);
    this.buildHud();

    if (data?.checkpoint) {
      // 이어하기: 도와주는 아이도 다시 데려온다.
      if (this.sharedFigs) this.helper = this.talkers.find((t) => t.sprite.texture.key === 'kid-cry')?.sprite;
      this.setupArena();
      this.cameras.main.fadeIn(300);
      if (data.checkpoint === 'rush') this.beginRush();
      else this.startGather();
      return;
    }

    await titleCard(this, '6장 · 오병이어', '디베랴 바다 건너편 언덕');
    await this.controls.modal(async () => {
      await openScroll(this, [REF.intro]);
      await say(
        this,
        '나',
        '사람들이 끝도 없이 언덕 쪽으로 걸어간다. 나도 아침부터 따라왔다.',
        '배가 고프다. 주머니엔 말린 무화과 세 개뿐이다.',
      );
    });
    Save.addVerses([REF.intro]);
  }

  /** 걷는 구역의 세로 위치(0 위쪽 ~ 1 아래쪽) */
  private yAt(f: number) {
    return Math.round(this.yMin + f * (this.yMax - this.yMin));
  }

  // ───────── 월드 ─────────

  private buildWorld() {
    const { H, groundTop } = this;
    const totalW = WALK_W + this.W;
    const seaY = groundTop - 34;
    // 하늘(위는 진하게, 수평선 쪽은 밝게)과 구름, 먼 바다, 언덕
    const sky = this.add.graphics().setScrollFactor(0);
    sky.fillStyle(PAL.sky).fillRect(0, 0, this.W, seaY);
    sky.fillStyle(PAL.skyLight).fillRect(0, Math.floor(seaY * 0.55), this.W, seaY);
    sky.fillStyle(PAL.skyLight);
    for (let x = 0; x < this.W; x += 4) sky.fillRect(x, Math.floor(seaY * 0.55) - 1, 2, 1);
    for (let i = 0; i < 12; i++) {
      const cx = i * 130 + ((i * 53) % 60);
      const cy = 6 + ((i * 37) % Math.max(8, seaY - 22));
      this.add.image(cx, cy, 'cloud').setOrigin(0).setScrollFactor(0.3, 1).setScale(i % 3 === 0 ? 2 : 1);
    }
    const sea = this.add.tileSprite(0, seaY, totalW, 16, 'water').setOrigin(0).setScrollFactor(0.6, 1);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 4000, repeat: -1 });
    const hill = this.add.graphics();
    for (let x = 0; x < totalW; x += 2) {
      const h = Math.round(14 + Math.sin(x / 90) * 5 + Math.min(12, Math.max(0, (x - 900) / 25)));
      hill.fillStyle(PAL.teal).fillRect(x, groundTop - h, 2, h + 2);
      hill.fillStyle(PAL.aqua).fillRect(x, groundTop - h, 2, 1);
    }
    hill.fillStyle(PAL.pine).fillRect(0, groundTop - 2, totalW, 2);
    for (let y = groundTop; y < H; y += 16) for (let x = 0; x < totalW; x += 16) this.add.image(x, y, grassTile(x, y)).setOrigin(0);
    for (const [x, f] of [
      [210, 0.2],
      [520, 0.9],
      [880, 0.1],
      [1040, 0.75],
      [1210, 0.3],
    ]) {
      const y = this.yAt(f);
      this.add.image(x, y, 'rock').setDepth(y - 6);
    }
    // 언덕 가장자리의 올리브 나무와 덤불
    for (const x of [60, 300, 610, 820, 1000, 1120]) this.add.image(x, groundTop + 4, 'tree').setOrigin(0.5, 1).setDepth(groundTop);
    for (const [x, f] of [
      [120, 0.95],
      [400, 0.05],
      [760, 0.95],
      [960, 0.5],
    ]) {
      const y = this.yAt(f);
      this.add.image(x, y, 'bush').setDepth(y - 4);
    }

    // 멀리 언덕 위의 빛: 조작할 수 없고 말하지 않는다(설계 원칙 3·5).
    this.add.image(1190, groundTop - 16, 'halo').setScale(1.4).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
    this.add.sprite(1190, groundTop - 14, 'light-figure', 0).setDepth(groundTop - 14);

    // 앞서 걷는 무리
    for (let i = 0; i < 14; i++) {
      const s = this.add.sprite(120 + i * 80 + ((i * 37) % 40), this.yAt(((i * 53) % 90) / 90), `crowd${i % 6}`, 0);
      s.setDepth(s.y);
      // 옆모습으로 오가며 걷는다.
      s.play(`crowd${i % 6}-walk-side`);
      s.anims.setProgress((i % 4) / 4);
      this.tweens.add({
        targets: s,
        x: `+=${160 + (i % 3) * 40}`,
        duration: 9000 + i * 400,
        yoyo: true,
        repeat: -1,
        onYoyo: () => s.setFlipX(true),
        onRepeat: () => s.setFlipX(false),
      });
    }

    // 가상 인물들
    this.addTalker('crowd1', 150, this.yAt(0.35), () =>
      say(this, '어부 아저씨', '가버나움에서부터 따라왔단다. 그분이 병든 사람들을 고치시는 걸 봤다는 사람이 한둘이 아니야.'),
    );
    this.addTalker('crowd3', 330, this.yAt(0.8), () => say(this, '아주머니', '명절이 가까워서 그런지 사람이 더 많구나. 얘야, 길 잃지 않게 조심하렴.'));
    this.addTalker('kid-cry', 470, this.yAt(0.5), () => this.meetCryingKid());
    this.addTalker('crowd5', 720, this.yAt(0.25), () =>
      say(this, '목동', '저 앞 바위 옆에 도시락 바구니 든 아이가 있던데? 이렇게 많은 사람 중에 먹을 걸 챙겨 온 건 그 애뿐인가 봐.'),
    );
    this.addTalker('kid-lunch', 1060, this.yAt(0.6), () => this.meetLunchBoy());
  }

  private addTalker(key: string, x: number, y: number, talk: () => Promise<void>) {
    const sprite = this.add.sprite(x, y, key, 0).setDepth(y);
    const mark = new Tag(this, x, y - 20, '!', { fg: PAL.white, bg: PAL.red, border: PAL.ink, originX: 0.5, originY: 1, padX: 3, padY: 2 }).setDepth(900);
    this.tweens.add({ targets: mark, y: y - 22, duration: 500, yoyo: true, repeat: -1 });
    const talker: Talker = {
      sprite,
      talk: async () => {
        mark.setVisible(false);
        await talk();
      },
    };
    sprite.setInteractive().on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
      if (Phaser.Math.Distance.Between(sprite.x, sprite.y, this.player.x, this.player.y) < 40) {
        e.stopPropagation();
        this.interact(talker);
      }
    });
    this.talkers.push(talker);
  }

  private async interact(t: Talker) {
    if (this.controls.busy || this.phase !== 'walk' || t.sprite === this.helper) return;
    // 서로 마주 본다.
    const left = t.sprite.x < this.player.x;
    faceTo(this.player, 'side', left);
    if (t.sprite !== this.helper) faceTo(t.sprite, 'side', !left);
    await this.controls.modal(() => t.talk());
  }

  // ───────── HUD ─────────

  private buildHud() {
    const { W, H } = this;
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H).setScrollFactor(0).setDepth(DEPTH_UI - 10).setAlpha(0);
    const hud = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T): T =>
      o.setScrollFactor(0).setDepth(DEPTH_UI - 5) as T;
    // 왼쪽 위: 배부름 게이지와 무화과
    const panel = hud(this.add.graphics());
    drawPanel(panel, 4, 4, 70, 16, 'dark');
    drawPanel(panel, 78, 4, 30, 16, 'dark');
    hud(this.add.image(13, 12, 'bread'));
    hud(this.add.rectangle(22, 9, 48, 6, PAL.ink).setOrigin(0));
    this.hungerBar = hud(this.add.rectangle(23, 10, 46, 4, PAL.honey).setOrigin(0));
    hud(this.add.image(87, 12, 'fig'));
    this.figText = hud(bt(this, 95, 5, `${this.figs}`, PAL.white));
    // 오른쪽 위: 목표
    const inset = menuButtonInset(this.scale.zoom, isPortraitScreen());
    this.goalText = hud(new Tag(this, W - 4 - inset, 4, ' ', { fg: PAL.white, bg: PAL.night, border: PAL.ink, originX: 1, padY: 4 }).setVisible(false));
    const walkHint = isPortraitScreen() ? '패드로 걷기 · 사람 옆에서 확인 버튼으로 말 걸기' : '누르고 있는 쪽으로 걷기 · 가까이서 사람을 눌러 말 걸기';
    this.hint = hud(new Tag(this, W / 2, H - 8, ' ', { fg: PAL.white, bg: PAL.ink, border: PAL.indigo, originX: 0.5, originY: 1, padY: 4 }));
    this.showHint(walkHint);
    this.time.delayedCall(7000, () => this.phase === 'walk' && this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
  }

  /** 화면 아래 안내 문구를 바꿔 보여준다. */
  private showHint(text: string) {
    this.tweens.killTweensOf(this.hint);
    // 좁은 화면에서는 띄어쓰기에서 줄을 나눈다.
    const lines = wrapWords(text, this.W - 30, measurer('ui')).join('\n');
    // 배급·거두기 때는 사람들을 가리지 않게 하늘 쪽(위)에 둔다.
    if (this.phase === 'walk') this.hint.setPosition(this.W / 2, this.H - 8).setAnchor(0.5, 1);
    else this.hint.setPosition(this.W / 2, 26).setAnchor(0.5, 0);
    this.hint.setLabel(lines).setAlpha(1);
  }

  private setHunger(v: number) {
    this.hunger = Phaser.Math.Clamp(v, 0, 100);
    this.hungerBar.width = (45 * this.hunger) / 100;
    this.vignette.setAlpha((1 - this.hunger / 100) * 0.7);
  }

  // ───────── 걷기 단계의 사건 ─────────

  private async meetCryingKid() {
    await say(this, '우는 아이', '엄마 따라 여기까지 왔는데… 배고파. 다리도 아파.');
    if (this.figs === 0 || this.sharedFigs) return;
    const pick = await choose(this, '주머니에 무화과가 세 개 있다.', ['무화과를 나눠 준다', '그냥 지나간다']);
    if (pick === 0) {
      this.sharedFigs = true;
      this.figs = 1;
      this.figText.setText(`${this.figs}`);
      Save.setFlag('sharedFigs', true);
      await say(this, '우는 아이', '…고마워! 나도 너 따라갈래.');
      // 나눈 아이는 배급 러시에서 함께 떡을 나른다.
      const kid = this.talkers.find((t) => t.sprite.texture.key === 'kid-cry')!.sprite;
      this.helper = kid;
    } else {
      await say(this, '나', '미안해… 나도 배가 고파.');
    }
  }

  private async meetLunchBoy() {
    // 본문 속 "한 아이"는 말하지 않는다. 주인공의 생각과 본문 두루마리로만 보여준다.
    await say(this, '나', '바구니 안에 보리떡과 작은 물고기가 보인다. 언덕 위에서 무슨 이야기가 오가는 것 같다.');
    await openScroll(this, [REF.lunch]);
    Save.addVerses([REF.lunch]);
    this.phase = 'rush';
    await this.startRush();
  }

  // ───────── 배급 러시 ─────────

  private async startRush() {
    const cam = this.cameras.main;
    await new Promise<void>((r) => (cam.fadeOut(500, ...rgb(PAL.white)), cam.once('camerafadeoutcomplete', () => r())));
    this.setupArena();
    cam.fadeIn(500);
    await openScroll(this, [REF.sit]);
    Save.addVerses([REF.sit]);
    // 떡을 받는 순간 배가 차오르고 화면이 따뜻한 색으로 번진다.
    this.tweens.addCounter({ from: this.hunger, to: 100, duration: 1200, onUpdate: (tw) => this.setHunger(tw.getValue() ?? 100) });
    cam.flash(700, ...rgb(PAL.gold));
    await this.controls.modal(() =>
      say(
        this,
        '나',
        '따뜻한 보리떡 한 조각이 내 손에도 왔다. 배가 차오른다.',
        '나도 나르자! 가운데 바구니에 가면 떡이나 물고기를 받을 수 있다.',
        '말풍선에 그려진 음식과 같은 걸 들고 그 사람들 곁으로 가면 건네줄 수 있다.',
      ),
    );
    this.beginRush();
  }

  /** 배급 구역(사람들이 앉은 언덕)을 만든다. */
  private setupArena() {
    const { W } = this;
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.setBounds(ARENA_X, 0, W, this.H);
    cam.setScroll(ARENA_X, 0);
    this.phase = 'rush';
    this.setHunger(100);
    this.talkers.forEach((t) => t.sprite.disableInteractive());

    const cx = ARENA_X + Math.round(W / 2);
    const cy = this.yAt(0.45);
    this.player.setPosition(cx, cy + 22);
    this.stations = [
      { food: 'bread', x: cx - 16, y: cy },
      { food: 'fish', x: cx + 16, y: cy },
    ];
    for (const s of this.stations) {
      this.add.image(s.x, s.y, 'basket-full').setDepth(s.y);
      this.add.image(s.x, s.y - 10, s.food).setDepth(s.y + 1);
    }
    // 빈손이면 바구니 위에 화살표를 띄워 어디로 갈지 알려 준다.
    this.stationArrow = this.add.triangle(cx, cy - 26, 0, 0, 10, 0, 5, 6, PAL.red).setDepth(960);
    this.tweens.add({ targets: this.stationArrow, y: cy - 22, duration: 400, yoyo: true, repeat: -1 });

    const spots = [
      [0.08, 0.05],
      [0.36, 0.0],
      [0.64, 0.0],
      [0.92, 0.05],
      [0.06, 0.42],
      [0.94, 0.42],
      [0.26, 0.66],
      [0.74, 0.66],
      [0.08, 0.84],
      [0.92, 0.84],
      [0.36, 1],
      [0.64, 1],
    ];
    spots.forEach(([fx, fy], i) => {
      const gx = ARENA_X + 18 + Math.round(fx * (W - 36));
      const gy = Math.round(this.yMin + 14 + fy * (this.yMax - this.yMin - 16));
      const sprites = [-9, 0, 9].map((dx, k) =>
        this.add.image(gx + dx, gy - (k === 1 ? 4 : 0), `sitter${(i + k) % 8}`).setDepth(gy - 2 + (k === 1 ? -1 : 0)),
      );
      const bubble = this.add.container(gx, gy - 22).setDepth(950).setVisible(false);
      bubble.add([this.add.image(0, 0, 'bubble'), this.add.image(0, -2, 'bread').setName('icon')]);
      this.groups.push({ sprites, x: gx, y: gy, want: null, bubble, cooldown: 400 + i * 350 });
    });

    if (this.helper) {
      this.helper.setPosition(cx - 40, cy + 20).setVisible(true);
      faceTo(this.helper, 'down');
    }
  }

  private beginRush() {
    this.phase = 'rush';
    this.updateGoal();
    this.updateRushHint();
  }

  private updateRushHint() {
    if (this.phase !== 'rush') return;
    this.stationArrow?.setVisible(!this.carrying);
    this.showHint(
      this.carrying
        ? `${this.carrying.food === 'bread' ? '떡을' : '물고기를'} 원하는 사람(말풍선)에게 가져다줘요`
        : '가운데 바구니로 가서 떡이나 물고기를 받아요',
    );
  }

  private updateGoal() {
    const label =
      this.phase === 'rush'
        ? `나눈 음식 ${this.delivered}/${DELIVERY_GOAL}`
        : this.phase === 'gather'
          ? `바구니 ${Math.floor(this.crumbCount / CRUMBS_PER_BASKET)}/${BASKETS}`
          : '';
    this.goalText.setVisible(label !== '');
    if (label) this.goalText.setLabel(label);
  }

  private setCarry(c: { food: Food; count: number } | null) {
    const changed = (this.carrying === null) !== (c === null) || this.carrying?.food !== c?.food;
    this.carrying = c;
    this.carryIcon.removeAll(true);
    if (c) {
      for (let i = 0; i < c.count; i++) this.carryIcon.add(this.add.image((i - (c.count - 1) / 2) * 7, -i, c.food));
    }
    this.carryIcon.setVisible(!!c);
    if (changed) this.updateRushHint();
  }

  private updateRush(delta: number) {
    const p = this.player;
    for (const s of this.stations) {
      if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < 18 && (!this.carrying || this.carrying.food !== s.food || this.carrying.count < CARRY)) {
        this.setCarry({ food: s.food, count: CARRY });
      }
    }
    for (const g of this.groups) {
      if (g.want === null) {
        g.cooldown -= delta;
        if (g.cooldown <= 0 && this.delivered + this.pendingWants() < DELIVERY_GOAL) {
          g.want = Math.random() < 0.6 ? 'bread' : 'fish';
          (g.bubble.getByName('icon') as Phaser.GameObjects.Image).setTexture(g.want);
          g.bubble.setVisible(true).setScale(0);
          this.tweens.add({ targets: g.bubble, scale: 1, duration: 200, ease: 'Back.Out' });
        }
        continue;
      }
      if (this.carrying && Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y - 6) < 22) {
        if (this.carrying.food === g.want) {
          this.feed(g);
          const left = this.carrying.count - 1;
          this.setCarry(left > 0 ? { food: this.carrying.food, count: left } : null);
        } else if (!this.tweens.isTweening(g.bubble)) {
          this.tweens.add({ targets: g.bubble, x: g.x + 2, duration: 50, yoyo: true, repeat: 2 });
        }
      }
    }
    this.runHelper();
  }

  private pendingWants() {
    return this.groups.filter((g) => g.want !== null).length;
  }

  private feed(g: Group) {
    g.want = null;
    g.cooldown = 2500 + Math.random() * 3000;
    this.tweens.add({ targets: g.bubble, scale: 0, duration: 150, onComplete: () => g.bubble.setVisible(false) });
    for (const s of g.sprites) this.tweens.add({ targets: s, y: s.y - 3, duration: 90, yoyo: true });
    const heart = this.add.image(g.x, g.y - 20, 'heart').setDepth(960);
    this.tweens.add({ targets: heart, y: g.y - 34, alpha: 0, duration: 700, onComplete: () => heart.destroy() });
    this.delivered++;
    this.updateGoal();
    if (this.delivered >= DELIVERY_GOAL && this.phase === 'rush') this.endRush();
  }

  /** 무화과를 나눠 받은 아이가 함께 나른다(협동 보너스). */
  private runHelper() {
    const h = this.helper;
    if (!h || this.helperBusy || this.phase !== 'rush') return;
    const target = this.groups.find((g) => g.want !== null);
    if (!target) return;
    this.helperBusy = true;
    const station = this.stations.find((s) => s.food === target.want)!;
    const walk = (x: number, y: number) =>
      new Promise<void>((r) => {
        const d = Phaser.Math.Distance.Between(h.x, h.y, x, y);
        faceAndWalk(h, 'kid-cry', x - h.x, y - h.y);
        this.tweens.add({
          targets: h,
          x,
          y,
          duration: (d / 50) * 1000,
          onUpdate: () => h.setDepth(h.y),
          onComplete: () => (faceAndWalk(h, 'kid-cry', 0, 0), r()),
        });
      });
    (async () => {
      await walk(station.x - 12, station.y + 14);
      if (target.want !== null && this.phase === 'rush') {
        await walk(target.x, target.y + 12);
        if (target.want !== null && this.phase === 'rush') this.feed(target);
      }
      this.time.delayedCall(1200, () => (this.helperBusy = false));
    })();
  }

  private async endRush() {
    this.phase = 'done';
    this.setCarry(null);
    this.stationArrow?.setVisible(false);
    this.groups.forEach((g) => g.bubble.setVisible(false));
    this.tweens.killTweensOf(this.helper ?? []);
    await this.controls.modal(async () => {
      await say(this, '나', '모두 원하는 만큼 먹었다. 언덕에 웃음소리가 가득하다.');
      await openScroll(this, [REF.gather]);
    });
    Save.addVerses([REF.gather]);
    this.startGather();
  }

  // ───────── 남은 조각 거두기 ─────────

  private startGather() {
    this.phase = 'gather';
    this.stationArrow?.setVisible(false);
    this.groups.forEach((g) => g.bubble.setVisible(false));
    for (let i = 0; i < BASKETS * CRUMBS_PER_BASKET; i++) {
      const g = this.groups[i % this.groups.length];
      const x = Phaser.Math.Clamp(g.x + Phaser.Math.Between(-26, 26), ARENA_X + 8, ARENA_X + this.W - 8);
      const y = Phaser.Math.Clamp(g.y + Phaser.Math.Between(-4, 14), this.yMin, this.yMax);
      this.crumbs.push(this.add.image(x, y, 'crumb').setDepth(y - 8));
    }
    // 바구니 줄은 화면 위쪽, 안내 문구 아래에 둔다.
    for (let i = 0; i < BASKETS; i++) {
      this.basketIcons.push(
        this.add
          .image(this.W / 2 + (i - (BASKETS - 1) / 2) * 16, 52, 'basket')
          .setScrollFactor(0)
          .setDepth(DEPTH_UI - 5),
      );
    }
    this.showHint('흩어진 떡 조각을 주워 바구니를 채워요');
    this.updateGoal();
  }

  private updateGather() {
    const p = this.player;
    for (const c of this.crumbs) {
      if (!c.active || Phaser.Math.Distance.Between(p.x, p.y + 6, c.x, c.y) > 12) continue;
      c.destroy();
      this.crumbCount++;
      if (this.crumbCount % CRUMBS_PER_BASKET === 0) {
        const icon = this.basketIcons[this.crumbCount / CRUMBS_PER_BASKET - 1];
        icon.setTexture('basket-full');
        this.tweens.add({ targets: icon, y: icon.y - 4, duration: 120, yoyo: true });
      }
      this.updateGoal();
    }
    if (this.crumbCount >= BASKETS * CRUMBS_PER_BASKET) this.finish();
  }

  private async finish() {
    this.phase = 'done';
    this.hint.setAlpha(0);
    await this.controls.modal(() => openScroll(this, [REF.end]));
    Save.addVerses([REF.end]);
    Save.setFlag('sharedFigs', this.sharedFigs);
    this.cameras.main.fadeOut(900, ...rgb(PAL.ink));
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start('Campfire', { ch: 6, next: 'End', flags: { sharedFigs: this.sharedFigs, keptFigs: !this.sharedFigs } }),
    );
  }

  // ───────── 매 프레임 ─────────

  update(_t: number, delta: number) {
    if (!this.player) return;
    const p = this.player;
    const hungerFactor = this.phase === 'walk' ? 0.45 + (0.55 * this.hunger) / 100 : 1;
    const v = this.controls.move(p);
    const speed = BASE_SPEED * hungerFactor * (delta / 1000);
    if (v.lengthSq() > 0 && this.phase !== 'done') {
      const minX = this.phase === 'walk' ? 8 : ARENA_X + 8;
      const maxX = this.phase === 'walk' ? WALK_W - 8 : ARENA_X + this.W - 8;
      p.x = Phaser.Math.Clamp(p.x + v.x * speed, minX, maxX);
      p.y = Phaser.Math.Clamp(p.y + v.y * speed, this.yMin, this.yMax);
      // 걷는 방향에 따라 앞·뒤·옆모습이 바뀐다.
      faceAndWalk(p, 'player', v.x, v.y);
    } else faceAndWalk(p, 'player', 0, 0);
    p.setDepth(p.y);
    this.carryIcon.setPosition(p.x, p.y - 18);

    if (this.phase === 'walk') {
      // 걸을수록 배가 고파진다. 걸음이 느려지고 화면 가장자리가 흐려진다.
      const moved = Math.abs(p.x - this.lastX);
      this.setHunger(Math.max(12, this.hunger - moved * 0.085));
      if (this.helper && this.helper.visible) {
        // 무화과를 나눠 받은 아이가 뒤따라온다.
        const h = this.helper;
        const behind = p.flipX ? 18 : -18;
        const dx = (p.x + behind - h.x) * 0.06;
        const dy = (p.y + 4 - h.y) * 0.06;
        h.x += dx;
        h.y += dy;
        h.setDepth(h.y);
        faceAndWalk(h, 'kid-cry', Math.abs(dx) > 0.15 ? dx : 0, Math.abs(dy) > 0.15 ? dy : 0);
      }
      if (this.controls.actionPressed()) {
        const near = this.talkers.find((t) => Phaser.Math.Distance.Between(t.sprite.x, t.sprite.y, p.x, p.y) < 26 && t.sprite !== this.helper);
        if (near) this.interact(near);
      }
    } else if (this.phase === 'rush') {
      this.updateRush(delta);
    } else if (this.phase === 'gather') {
      this.updateGather();
    }
    this.lastX = p.x;
  }
}
