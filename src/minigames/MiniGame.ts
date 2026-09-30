// 미니게임 공통 틀: 방법 안내 → 플레이 → (세 번 실패하면 건너뛰기) → 이야기 장면으로 돌아가기.
// 실패해도 벌칙이 없고 이야기는 끊기지 않는다(설계 문서 4장 난이도·접근성).
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { Controls } from '../ui/Controls.ts';
import { drawPanel } from '../ui/panel.ts';
import { bt, DEPTH_UI, measurer, Tag, waitPress } from '../ui/text.ts';
import { wrapWords } from '../ui/wrap.ts';

export const MINIGAME_DONE = 'minigame-done';

export abstract class MiniGame extends Phaser.Scene {
  protected controls!: Controls;
  protected W = 320;
  protected H = 180;
  protected fails = 0;
  protected finished = false;
  private skipTag?: Tag;
  private statusTag!: Tag;

  abstract readonly title: string;
  abstract readonly howTo: string;

  /** 게임을 만든다(배경·물체) */
  protected abstract build(): void;
  /** 방법 안내를 닫은 뒤 시작 */
  protected abstract begin(): void;

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.fails = 0;
    this.finished = false;
    this.skipTag = undefined;
    this.controls = new Controls(this);
    this.controls.busy = true;
    this.cameras.main.setBackgroundColor(PAL.ink);
    this.build();
    this.statusTag = new Tag(this, this.W / 2, 4, ' ', { fg: PAL.honey, bg: PAL.night, border: PAL.ink, originX: 0.5, padY: 4 })
      .setScrollFactor(0)
      .setDepth(DEPTH_UI - 5)
      .setVisible(false);
    this.showHowTo();
  }

  private async showHowTo() {
    const { W, H } = this;
    const measure = measurer('ui');
    const pw = Math.min(W - 24, 260);
    const lines = wrapWords(this.howTo, pw - 24, measure);
    const ph = 34 + lines.length * 13 + 22;
    const x = Math.round((W - pw) / 2);
    const y = Math.round((H - ph) / 2);
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH_UI + 30);
    root.add(this.add.rectangle(0, 0, W, H, PAL.ink, 0.6).setOrigin(0));
    root.add(drawPanel(this.add.graphics(), x, y, pw, ph, 'dark'));
    root.add(bt(this, W / 2, y + 8, this.title, PAL.honey, 'body').setOrigin(0.5, 0));
    lines.forEach((l, i) => root.add(bt(this, x + 12, y + 30 + i * 13, l, PAL.mist)));
    const go = bt(this, W / 2, y + ph - 16, '눌러서 시작', PAL.white).setOrigin(0.5, 0);
    this.tweens.add({ targets: go, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    root.add(go);
    await waitPress(this);
    root.destroy();
    this.controls.busy = false;
    this.begin();
    // 실패가 없는 게임이라도 오래 걸리면 건너뛸 수 있게 한다.
    this.time.delayedCall(45000, () => {
      while (!this.finished && this.fails < 3) this.fails++;
      if (!this.finished) this.failOnce();
    });
  }

  /** 상단에 진행 상황 표시 */
  protected setStatus(text: string) {
    this.statusTag.setLabel(text).setVisible(true);
  }

  /** 실패 한 번. 세 번째부터 건너뛰기 버튼이 나온다. */
  protected failOnce() {
    this.fails++;
    Sfx.miss();
    if (this.fails >= 3 && !this.skipTag) {
      this.skipTag = new Tag(this, this.W - 6, this.H - 6, '건너뛰기 ▶', { fg: PAL.white, bg: PAL.indigo, border: PAL.ink, originX: 1, originY: 1, padX: 7, padY: 5 })
        .setScrollFactor(0)
        .setDepth(DEPTH_UI);
      this.skipTag.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.complete(true);
      });
    }
  }

  /** 끝. 잠깐 보여준 뒤 이야기 장면으로 돌아간다. */
  protected complete(skipped = false) {
    if (this.finished) return;
    this.finished = true;
    this.controls.busy = true;
    if (!skipped) Sfx.done();
    this.time.delayedCall(skipped ? 100 : 1200, () => {
      this.cameras.main.fadeOut(400, 46, 34, 47);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.game.events.emit(MINIGAME_DONE, { key: this.scene.key, skipped });
        this.scene.stop();
      });
    });
  }
}
