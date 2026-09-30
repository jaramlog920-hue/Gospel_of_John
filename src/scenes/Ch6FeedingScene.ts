// 6장 「오병이어」: 걷기(배고픔 게이지·무화과 나누기) → 도시락 든 아이 찾기 → 배급 러시 → 남은 조각 열두 바구니.
// 예수님과 성경 인물은 말하지 않는다. 사건은 두루마리 본문으로 보여주고, 대화는 가상 인물만 한다(설계 원칙 3·5).
import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { Save } from '../state/save.ts';
import { Controls } from '../ui/Controls.ts';
import { choose, say, titleCard } from '../ui/Dialog.ts';
import { FONT_UI, GAME_HEIGHT, GAME_WIDTH } from '../ui/layout.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { DEPTH_UI } from '../ui/text.ts';

const WALK_W = 1280;
const ARENA_X = WALK_W; // 배급 구역은 걷기 구역 오른쪽에 붙인다
const Y_MIN = 78;
const Y_MAX = 168;
const BASE_SPEED = 72;
const DELIVERY_GOAL = 30;
const CARRY = 3;
const CRUMBS_PER_BASKET = 5;
const BASKETS = 12;

type Phase = 'walk' | 'rush' | 'gather' | 'done';
type Food = 'bread' | 'fish';

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

export class Ch6FeedingScene extends Phaser.Scene {
  private controls!: Controls;
  private player!: Phaser.GameObjects.Sprite;
  private phase: Phase = 'walk';
  private hunger = 100;
  private figs = 3;
  private sharedFigs = false;
  private talkers: Talker[] = [];
  private vignette!: Phaser.GameObjects.Image;
  private hungerBar!: Phaser.GameObjects.Rectangle;
  private figText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private lastX = 0;

  // 배급 러시
  private carrying: { food: Food; count: number } | null = null;
  private carryIcon!: Phaser.GameObjects.Container;
  private stations: { food: Food; x: number; y: number }[] = [];
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

  async create() {
    Object.assign(this, {
      phase: 'walk',
      hunger: 100,
      figs: 3,
      sharedFigs: false,
      talkers: [],
      carrying: null,
      stations: [],
      groups: [],
      delivered: 0,
      helper: undefined,
      helperBusy: false,
      crumbs: [],
      crumbCount: 0,
      basketIcons: [],
    });
    this.controls = new Controls(this);
    this.cameras.main.setBackgroundColor(PAL.sky);
    this.buildWorld();

    this.player = this.add.sprite(40, 130, 'player', 0);
    this.lastX = this.player.x;
    this.carryIcon = this.add.container(0, 0).setDepth(900).setVisible(false);
    this.cameras.main.setBounds(0, 0, WALK_W, GAME_HEIGHT).startFollow(this.player, true, 0.15, 0.15);
    this.buildHud();

    await titleCard(this, '6장 · 오병이어', '디베랴 바다 건너편 언덕');
    await this.controls.modal(() =>
      say(
        this,
        '나',
        '사람들이 끝도 없이 언덕 쪽으로 걸어간다. 나도 아침부터 따라왔다.',
        '배가 고프다. 주머니엔 말린 무화과 세 개뿐이다.',
      ),
    );
  }

  // ───────── 월드 ─────────

  private buildWorld() {
    const totalW = WALK_W + GAME_WIDTH;
    // 하늘과 먼 바다, 언덕
    this.add.rectangle(0, 0, totalW, 40, PAL.sky).setOrigin(0);
    for (let x = 0; x < totalW; x += 16) this.add.image(x, 40, 'water').setOrigin(0).setScrollFactor(0.6, 1);
    const hill = this.add.graphics();
    hill.fillStyle(PAL.grassDeep);
    for (let x = 0; x < totalW; x += 4) {
      const h = 18 + Math.sin(x / 90) * 8 + Math.min(20, Math.max(0, (x - 900) / 20));
      hill.fillRect(x, 70 - h, 4, h + 2);
    }
    for (let y = 70; y < GAME_HEIGHT; y += 16) for (let x = 0; x < totalW; x += 16) this.add.image(x, y, 'grass').setOrigin(0);
    for (const [x, y] of [
      [210, 96],
      [520, 160],
      [880, 90],
      [1040, 150],
      [1210, 104],
    ])
      this.add.image(x, y, 'rock').setDepth(y - 6);

    // 멀리 언덕 위의 빛: 조작할 수 없고 말하지 않는다(설계 원칙 3·5).
    this.add.image(1190, 50, 'halo').setScale(1.4).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
    this.add.sprite(1190, 52, 'light-figure', 0).setDepth(52);

    // 앞서 걷는 무리
    for (let i = 0; i < 14; i++) {
      const s = this.add.sprite(120 + i * 80 + ((i * 37) % 40), Y_MIN + ((i * 53) % (Y_MAX - Y_MIN)), `crowd${i % 6}`, 0);
      s.play(`crowd${i % 6}-walk`);
      s.anims.setProgress((i % 4) / 4);
      this.tweens.add({ targets: s, x: `+=${160 + (i % 3) * 40}`, duration: 9000 + i * 400, yoyo: true, repeat: -1, onYoyo: () => s.toggleFlipX(), onRepeat: () => s.toggleFlipX() });
    }

    // 가상 인물들
    this.addTalker('crowd1', 150, 110, () =>
      say(this, '어부 아저씨', '가버나움에서부터 따라왔단다. 그분이 병든 사람들을 고치시는 걸 봤다는 사람이 한둘이 아니야.'),
    );
    this.addTalker('crowd3', 330, 150, () => say(this, '아주머니', '명절이 가까워서 그런지 사람이 더 많구나. 얘야, 길 잃지 않게 조심하렴.'));
    this.addTalker('kid-cry', 470, 124, () => this.meetCryingKid());
    this.addTalker('crowd5', 720, 100, () =>
      say(this, '목동', '저 앞 바위 옆에 도시락 바구니 든 아이가 있던데? 이렇게 많은 사람 중에 먹을 걸 챙겨 온 건 그 애뿐인가 봐.'),
    );
    this.addTalker('kid-lunch', 1060, 134, () => this.meetLunchBoy());
  }

  private addTalker(key: string, x: number, y: number, talk: () => Promise<void>) {
    const sprite = this.add.sprite(x, y, key, 0).setDepth(y);
    const mark = this.add.text(x, y - 20, '!', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.gold) }).setOrigin(0.5).setDepth(900);
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
    this.player.anims.stop();
    this.player.setFlipX(t.sprite.x < this.player.x);
    await this.controls.modal(() => t.talk());
  }

  // ───────── HUD ─────────

  private buildHud() {
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH_UI - 10).setAlpha(0);
    const hud = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T): T =>
      o.setScrollFactor(0).setDepth(DEPTH_UI - 5) as T;
    hud(this.add.rectangle(6, 6, 64, 12, PAL.ink, 0.8).setOrigin(0));
    hud(this.add.text(9, 7, '배', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.white) }));
    hud(this.add.rectangle(22, 9, 45, 6, PAL.shadow).setOrigin(0));
    this.hungerBar = hud(this.add.rectangle(22, 9, 45, 6, PAL.bread).setOrigin(0));
    hud(this.add.image(80, 12, 'fig'));
    this.figText = hud(this.add.text(86, 6, '×3', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.ink) }));
    this.goalText = hud(this.add.text(GAME_WIDTH - 6, 6, '', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.ink) }).setOrigin(1, 0));
    this.hint = hud(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, '누르고 있는 쪽으로 걷기 · 가까이서 사람을 눌러 말 걸기', {
          fontFamily: FONT_UI,
          fontSize: '10px',
          color: css(PAL.white),
          backgroundColor: css(PAL.ink),
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5)
        .setAlpha(0.85),
    );
    this.time.delayedCall(6000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
  }

  private setHunger(v: number) {
    this.hunger = Phaser.Math.Clamp(v, 0, 100);
    this.hungerBar.width = (45 * this.hunger) / 100;
    this.vignette.setAlpha((1 - this.hunger / 100) * 0.85);
  }

  // ───────── 걷기 단계의 사건 ─────────

  private async meetCryingKid() {
    await say(this, '우는 아이', '엄마 따라 여기까지 왔는데… 배고파. 다리도 아파.');
    if (this.figs === 0 || this.sharedFigs) return;
    const pick = await choose(this, '주머니에 무화과가 세 개 있다.', ['무화과를 나눠 준다', '그냥 지나간다']);
    if (pick === 0) {
      this.sharedFigs = true;
      this.figs = 1;
      this.figText.setText(`×${this.figs}`);
      await say(this, '우는 아이', '…고마워! 나도 너 따라갈래.');
      // 나눈 아이는 배급 러시에서 함께 떡을 나른다.
      const kid = this.talkers.find((t) => t.sprite.texture.key === 'kid-cry')!.sprite;
      kid.play('kid-cry-walk');
      this.helper = kid;
    } else {
      await say(this, '나', '미안해… 나도 배가 고파.');
    }
  }

  private async meetLunchBoy() {
    // 본문 속 "한 아이"는 말하지 않는다. 주인공의 생각과 본문 두루마리로만 보여준다.
    await say(this, '나', '바구니 안에 보리떡과 작은 물고기가 보인다. 어른들이 이 아이를 앞으로 데려간다.');
    await openScroll(this, ['john:6:8-9']);
    this.phase = 'rush';
    await this.startRush();
  }

  // ───────── 배급 러시 ─────────

  private async startRush() {
    const cam = this.cameras.main;
    await new Promise<void>((r) => (cam.fadeOut(500, 244, 239, 230), cam.once('camerafadeoutcomplete', () => r())));
    cam.stopFollow();
    cam.setBounds(ARENA_X, 0, GAME_WIDTH, GAME_HEIGHT);
    cam.setScroll(ARENA_X, 0);
    this.player.setPosition(ARENA_X + 160, 132);
    this.talkers.forEach((t) => t.sprite.disableInteractive());

    this.stations = [
      { food: 'bread', x: ARENA_X + 144, y: 110 },
      { food: 'fish', x: ARENA_X + 176, y: 110 },
    ];
    for (const s of this.stations) {
      this.add.image(s.x, s.y, 'basket-full').setDepth(s.y);
      this.add.image(s.x, s.y - 10, s.food).setDepth(s.y + 1);
    }
    const spots = [
      [30, 90],
      [80, 84],
      [240, 84],
      [290, 92],
      [36, 128],
      [96, 146],
      [224, 146],
      [284, 128],
      [60, 168],
      [160, 168],
      [260, 168],
      [160, 84],
    ];
    spots.forEach(([x, y], i) => {
      const gx = ARENA_X + x;
      const sprites = [-9, 0, 9].map((dx, k) => this.add.image(gx + dx, y - (k === 1 ? 4 : 0), `sitter${(i + k) % 8}`).setDepth(y - 2 + (k === 1 ? -1 : 0)));
      const bubble = this.add.container(gx, y - 22).setDepth(950).setVisible(false);
      bubble.add([this.add.image(0, 0, 'bubble'), this.add.image(0, -2, 'bread').setName('icon')]);
      this.groups.push({ sprites, x: gx, y, want: null, bubble, cooldown: 400 + i * 350 });
    });

    if (this.helper) {
      this.helper.setPosition(ARENA_X + 120, 130).setVisible(true);
      this.helper.play('kid-cry-walk');
    }

    cam.fadeIn(500);
    await openScroll(this, ['john:6:10-11']);
    Save.addVerses(['john:6:8-9', 'john:6:10-11']);
    // 떡을 받는 순간 배가 차오르고 화면이 따뜻한 색으로 번진다.
    this.tweens.addCounter({ from: this.hunger, to: 100, duration: 1200, onUpdate: (tw) => this.setHunger(tw.getValue() ?? 100) });
    cam.flash(700, 242, 193, 78);
    await this.controls.modal(() =>
      say(
        this,
        '나',
        '따뜻한 보리떡 한 조각이 내 손에도 왔다. 배가 차오른다.',
        '가운데 바구니에서 떡이나 물고기를 받아, 말풍선을 띄운 사람들에게 날라 주자.',
      ),
    );
    this.updateGoal();
  }

  private updateGoal() {
    if (this.phase === 'rush') this.goalText.setText(`나눈 음식 ${this.delivered}/${DELIVERY_GOAL}`);
    else if (this.phase === 'gather') this.goalText.setText(`바구니 ${Math.floor(this.crumbCount / CRUMBS_PER_BASKET)}/${BASKETS}`);
    else this.goalText.setText('');
  }

  private setCarry(c: { food: Food; count: number } | null) {
    this.carrying = c;
    this.carryIcon.removeAll(true);
    if (!c) return this.carryIcon.setVisible(false);
    for (let i = 0; i < c.count; i++) this.carryIcon.add(this.add.image((i - (c.count - 1) / 2) * 7, -i, c.food));
    this.carryIcon.setVisible(true);
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
      if (this.carrying && Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y - 6) < 20) {
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
    const heart = this.add.text(g.x, g.y - 20, '♥', { fontFamily: FONT_UI, fontSize: '10px', color: css(PAL.rose) }).setOrigin(0.5).setDepth(960);
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
        h.setFlipX(x < h.x);
        const d = Phaser.Math.Distance.Between(h.x, h.y, x, y);
        this.tweens.add({ targets: h, x, y, duration: (d / 50) * 1000, onUpdate: () => h.setDepth(h.y), onComplete: () => r() });
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
    this.groups.forEach((g) => g.bubble.setVisible(false));
    this.tweens.killTweensOf(this.helper ?? []);
    await this.controls.modal(async () => {
      await say(this, '나', '모두 원하는 만큼 먹었다. 언덕에 웃음소리가 가득하다.');
      await openScroll(this, ['john:6:12']);
    });
    Save.addVerses(['john:6:12']);
    this.startGather();
  }

  // ───────── 남은 조각 거두기 ─────────

  private startGather() {
    this.phase = 'gather';
    for (let i = 0; i < BASKETS * CRUMBS_PER_BASKET; i++) {
      const g = this.groups[i % this.groups.length];
      const x = Phaser.Math.Clamp(g.x + Phaser.Math.Between(-26, 26), ARENA_X + 8, ARENA_X + GAME_WIDTH - 8);
      const y = Phaser.Math.Clamp(g.y + Phaser.Math.Between(-4, 14), Y_MIN, Y_MAX);
      this.crumbs.push(this.add.image(x, y, 'crumb').setDepth(y - 8));
    }
    for (let i = 0; i < BASKETS; i++) {
      this.basketIcons.push(
        this.add
          .image(GAME_WIDTH / 2 + (i - (BASKETS - 1) / 2) * 16, GAME_HEIGHT - 9, 'basket')
          .setScrollFactor(0)
          .setDepth(DEPTH_UI - 5),
      );
    }
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
    await this.controls.modal(() => openScroll(this, ['john:6:13']));
    Save.addVerses(['john:6:13']);
    Save.setFlag('sharedFigs', this.sharedFigs);
    this.cameras.main.fadeOut(900, 26, 20, 35);
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
      const maxX = this.phase === 'walk' ? WALK_W - 8 : ARENA_X + GAME_WIDTH - 8;
      p.x = Phaser.Math.Clamp(p.x + v.x * speed, minX, maxX);
      p.y = Phaser.Math.Clamp(p.y + v.y * speed, Y_MIN, Y_MAX);
      if (v.x !== 0) p.setFlipX(v.x < 0);
      if (!p.anims.isPlaying) p.play('player-walk');
    } else if (p.anims.isPlaying) {
      p.anims.stop();
      p.setFrame(0);
    }
    p.setDepth(p.y);
    this.carryIcon.setPosition(p.x, p.y - 18);

    if (this.phase === 'walk') {
      // 걸을수록 배가 고파진다. 걸음이 느려지고 화면 가장자리가 흐려진다.
      const moved = Math.abs(p.x - this.lastX);
      this.setHunger(Math.max(12, this.hunger - moved * 0.085));
      if (this.helper && this.helper.visible) {
        const h = this.helper;
        const tx = p.x - 18 * (p.flipX ? -1 : 1);
        h.x += (tx - h.x) * 0.06;
        h.y += (p.y + 4 - h.y) * 0.06;
        h.setFlipX(p.flipX).setDepth(h.y);
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
