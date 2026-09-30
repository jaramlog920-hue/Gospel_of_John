// 걷기 이야기 장면. 주인공이 걸어가다 빛나는 두루마리 표시에 닿으면 본문이 차례로 열린다.
// 본문은 두루마리로만(원칙 1·2), 대사는 주인공의 독백만(원칙 3), 선택은 사건을 바꾸지 않는다(원칙 7).
import Phaser from 'phaser';
import { PAL, rgb } from '../art/palette.ts';
import { faceAndWalk } from '../art/textures.ts';
import { Save } from '../state/save.ts';
import { goNext } from '../story/progress.ts';
import { STORIES, type Story } from '../story/stories.ts';
import { Controls } from '../ui/Controls.ts';
import { choose, say, titleCard } from '../ui/Dialog.ts';
import { menuButtonInset } from '../ui/layout.ts';
import { openScroll } from '../ui/ScrollFrame.ts';
import { DEPTH_UI, measurer, Tag } from '../ui/text.ts';
import { wrapWords } from '../ui/wrap.ts';
import { buildBackdrop, type Stage } from './backdrops.ts';

const SPEED = 60; // 프레임마다 1칸(떨림 방지)
const GAP = 140; // 두루마리 사이 거리

interface StoryData {
  id: string;
  beat?: number;
}

export class StoryScene extends Phaser.Scene {
  private story!: Story;
  private controls!: Controls;
  private player!: Phaser.GameObjects.Sprite;
  private marks: { img: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private next = 0;
  private busy = false;
  private stage!: Stage;
  private hint!: Tag;
  private progress!: Tag;

  constructor() {
    super('Story');
  }

  /** 화면을 돌려 다시 그릴 때 읽던 곳부터 이어서 한다. */
  checkpoint() {
    return { id: this.story.id, beat: this.next };
  }

  async create(data: StoryData) {
    this.story = STORIES[data?.id] ?? STORIES['1b'];
    const resumed = (data?.beat ?? 0) > 0;
    this.next = data?.beat ?? 0;
    this.marks = [];
    this.busy = false;
    const st = this.story;
    const { width: W, height: H } = this.scale;
    const portrait = H > W;
    const groundTop = Math.floor(H * (portrait ? 0.34 : 0.42));
    const worldW = Math.max(W, 100 + st.beats.length * GAP);
    const stage: Stage = {
      scene: this,
      W,
      H,
      worldW,
      groundTop,
      yMin: groundTop + 12,
      yMax: H - 10,
      ch: st.ch,
      lights: [],
      yAt(f) {
        return Math.round(this.yMin + f * (this.yMax - this.yMin));
      },
    };
    this.stage = stage;
    this.controls = new Controls(this);
    this.cameras.main.setBackgroundColor(PAL.ink);
    const { night } = buildBackdrop(stage, st.setting);

    // 밤: 화면을 어둡게 하고 등잔·숯불 둘레만 밝힌다.
    if (night) {
      this.add.rectangle(0, 0, W, H, PAL.dusk, 0.55).setOrigin(0).setScrollFactor(0).setDepth(DEPTH_UI - 20).setBlendMode(Phaser.BlendModes.MULTIPLY);
      for (const l of stage.lights)
        this.add.image(l.x, l.y, 'halo').setScale(l.r).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_UI - 19);
    }
    // 수난 장면: 채도를 낮춘다(원칙 6).
    if (st.solemn) this.cameras.main.postFX?.addColorMatrix().saturate(-0.55);

    // 두루마리 표시
    st.beats.forEach((_, i) => {
      const x = 90 + i * GAP;
      const y = stage.yAt(0.35 + ((i * 37) % 30) / 100);
      const halo = this.add.image(x, y - 6, 'halo').setScale(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_UI - 18).setAlpha(0);
      const img = this.add.image(x, y, 'scroll-mark').setOrigin(0.5, 1).setDepth(y);
      this.marks.push({ img, halo, x, y });
    });
    this.refreshMarks();

    this.player = this.add.sprite(resumed ? this.marks[this.next - 1].x + 20 : 30, stage.yAt(0.55), 'player', 8);
    this.cameras.main.setBounds(0, 0, worldW, H).startFollow(this.player, true, 1, 1);

    // 상단: 장 표시와 진행, 하단: 안내
    const inset = menuButtonInset(this.scale.zoom, window.matchMedia('(orientation: portrait)').matches);
    new Tag(this, 4, 4, `${st.ch}장 · ${st.title}`, { fg: PAL.white, bg: PAL.night, border: PAL.ink, padY: 4 }).setScrollFactor(0).setDepth(DEPTH_UI - 5);
    this.progress = new Tag(this, W - 4 - inset, 4, ' ', { fg: PAL.honey, bg: PAL.night, border: PAL.ink, originX: 1, padY: 4 })
      .setScrollFactor(0)
      .setDepth(DEPTH_UI - 5);
    this.hint = new Tag(this, W / 2, H - 8, ' ', { fg: PAL.white, bg: PAL.ink, border: PAL.indigo, originX: 0.5, originY: 1, padY: 4 })
      .setScrollFactor(0)
      .setDepth(DEPTH_UI - 5);
    this.updateProgress();

    if (!resumed) {
      await titleCard(this, `${st.ch}장 · ${st.title}`, st.sub);
      if (st.intro) await this.controls.modal(() => say(this, '나', st.intro!));
    }
    const walkHint = portrait ? '패드로 걸어 빛나는 두루마리로 가 보자' : '빛나는 두루마리 쪽으로 걸어가 보자';
    this.setHint(walkHint);
    this.time.delayedCall(6000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));
  }

  private setHint(text: string) {
    this.tweens.killTweensOf(this.hint);
    this.hint.setLabel(wrapWords(text, this.scale.width - 30, measurer('ui')).join('\n')).setAlpha(1);
  }

  private updateProgress() {
    this.progress.setLabel(`두루마리 ${this.next}/${this.story.beats.length}`);
  }

  /** 다음에 읽을 두루마리만 빛나고, 읽은 것은 흐리게, 남은 것은 조금 흐리게 */
  private refreshMarks() {
    this.marks.forEach((m, i) => {
      this.tweens.killTweensOf([m.img, m.halo]);
      m.img.setY(m.y);
      if (i < this.next) {
        m.img.setAlpha(0.35);
        m.halo.setAlpha(0);
      } else if (i === this.next) {
        m.img.setAlpha(1);
        m.halo.setAlpha(0.8);
        this.tweens.add({ targets: m.img, y: m.y - 3, duration: 450, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
        this.tweens.add({ targets: m.halo, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
      } else {
        m.img.setAlpha(0.6);
        m.halo.setAlpha(0);
      }
    });
  }

  private async readBeat(i: number) {
    this.busy = true;
    faceAndWalk(this.player, 'player', 0, 0);
    const beat = this.story.beats[i];
    await this.controls.modal(async () => {
      if (beat.note) await say(this, '나', beat.note);
      if (beat.choice) {
        const pick = await choose(this, beat.choice.prompt, beat.choice.options);
        beat.choice.flags.forEach((f, k) => Save.setFlag(f, k === pick));
      }
      await openScroll(this, [beat.ref], { noSkip: this.story.solemn });
    });
    Save.addVerses([beat.ref]);
    this.next = i + 1;
    this.afterBeat(i);
    this.refreshMarks();
    this.updateProgress();
    if (this.next >= this.story.beats.length) return this.finish();
    this.busy = false;
  }

  /** 장면마다 작은 연출 */
  private afterBeat(i: number) {
    const stone = this.stage.tombStone;
    // 11장: 무덤 앞 돌을 옮긴다. 19장: 돌로 입구를 막는다.
    if (stone && this.story.id === '11b' && i === 2) this.tweens.add({ targets: stone, x: stone.x + 26, duration: 1600, ease: 'Sine.InOut' });
    if (stone && this.story.id === '19c') this.tweens.add({ targets: stone, x: stone.x - 27, duration: 1600, ease: 'Sine.InOut' });
  }

  private finish() {
    this.hint.setAlpha(0);
    const ch = this.story.ch;
    const nextStory = Object.values(STORIES).find((s) => s.ch === ch && s !== this.story);
    if (!Save.data.chaptersDone.includes(ch) && !nextStory) Save.data.chaptersDone.push(ch);
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(700, ...rgb(PAL.ink));
      this.cameras.main.once('camerafadeoutcomplete', () => goNext(this));
    });
  }

  update() {
    if (!this.player || !this.stage) return;
    const p = this.player;
    const v = this.busy ? new Phaser.Math.Vector2(0, 0) : this.controls.move(p);
    const step = SPEED * (this.game.loop.delta / 1000);
    if (v.lengthSq() > 0) {
      p.x = Phaser.Math.Clamp(p.x + v.x * step, 8, this.stage.worldW - 8);
      p.y = Phaser.Math.Clamp(p.y + v.y * step, this.stage.yMin, this.stage.yMax);
    }
    faceAndWalk(p, 'player', v.x, v.y);
    p.setDepth(p.y);

    if (this.busy || this.next >= this.marks.length) return;
    const m = this.marks[this.next];
    const near = Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y - 4) < 16;
    // 닿거나, 가까이에서 확인 버튼을 누르면 읽는다.
    if (near || (this.controls.actionPressed() && Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) < 30)) this.readBeat(this.next);
  }
}
