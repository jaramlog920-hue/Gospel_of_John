// 장 퀴즈 장면(사용자 요청 2026-10-04). 장이 끝나면 그 장의 세 문제를 차례로 푼다.
// 고르기: 보기를 고른다. 차례 맞추기: 일어난 일을 첫째·그다음·마지막 순서로 고른다.
// 맞히면 근거 절을 두루마리로 연다. 틀려도 벌칙 없이 다시 고르고, 두 번 틀리면 두루마리로 근거를 먼저 보여 준다.
import Phaser from 'phaser';
import { PAL, rgb } from '../art/palette.ts';
import { Sfx } from '../audio/sfx.ts';
import { Save } from '../state/save.ts';
import { goNext } from '../story/progress.ts';
import { quizFlag, quizzesOf, type ChoiceQuiz, type OrderQuiz } from '../story/chapterQuiz.ts';
import { choose, say, titleCard } from '../ui/Dialog.ts';
import { openScroll } from '../ui/ScrollFrame.ts';

const RIGHT = ['맞았다!', '그래, 그거였어.', '본문에 그렇게 적혀 있었지.'];
const AGAIN = '음, 아닌 것 같다. 다시 생각해 보자.';
const PEEK = '두루마리를 다시 펼쳐 보자.';
const ORDER_STEPS = ['첫째는?', '그다음은?', '마지막은?'];

export class ChapterQuizScene extends Phaser.Scene {
  constructor() {
    super('ChapterQuiz');
  }

  async create(data: { ch: number }) {
    // 확인용 주소(?scene=ChapterQuiz&ch=2)에서는 글자로 들어온다
    const ch = Number(data?.ch ?? 1);
    this.drawBackdrop();
    this.cameras.main.fadeIn(500);
    await titleCard(this, `${ch}장을 마치며`, '기억나는 대로 골라 보자');
    const qs = quizzesOf(ch);
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const who = `${ch}장 퀴즈 ${i + 1}/${qs.length}`;
      if (q.type === 'choice') await this.askChoice(q, who, i);
      else await this.askOrder(q, who, i);
    }
    Save.setFlag(quizFlag(ch), true);
    await say(this, '나', `${ch}장을 다시 떠올려 보았다.`);
    this.cameras.main.fadeOut(500, ...rgb(PAL.ink));
    this.cameras.main.once('camerafadeoutcomplete', () => goNext(this));
  }

  private async askChoice(q: ChoiceQuiz, who: string, i: number) {
    let misses = 0;
    for (;;) {
      await say(this, who, q.question);
      const pick = await choose(this, q.title, q.options);
      if (pick === q.answer) break;
      Sfx.miss();
      misses++;
      await say(this, '나', AGAIN);
      if (misses === 2) {
        await say(this, '나', PEEK);
        await openScroll(this, [q.ref]);
      }
    }
    await say(this, '나', RIGHT[i % RIGHT.length]);
    await openScroll(this, [q.ref]);
  }

  private async askOrder(q: OrderQuiz, who: string, i: number) {
    let misses = 0;
    // 보기 순서는 매번 같게, 본문 차례와 다르게 섞는다
    const shuffled = [q.items[2], q.items[0], q.items[1]];
    for (;;) {
      await say(this, who, q.question);
      const left = [...shuffled];
      let ok = true;
      for (let k = 0; k < q.items.length && ok; k++) {
        const pick = await choose(this, ORDER_STEPS[k], left.map((x) => x.label));
        if (left[pick] !== q.items[k]) ok = false;
        else left.splice(pick, 1);
      }
      if (ok) break;
      Sfx.miss();
      misses++;
      await say(this, '나', AGAIN);
      if (misses === 2) {
        await say(this, '나', PEEK);
        await openScroll(this, q.items.map((x) => x.ref));
      }
    }
    await say(this, '나', RIGHT[i % RIGHT.length]);
    await openScroll(this, q.items.map((x) => x.ref));
  }

  /** 낮의 바닷가: 연하늘과 모래, 주인공이 앉아 생각한다 */
  private drawBackdrop() {
    const { width: W, height: H } = this.scale;
    const shore = Math.floor(H * 0.55);
    const g = this.add.graphics();
    const bands = [PAL.skyLight, PAL.skyLight, PAL.sky];
    const bandH = Math.ceil((shore - 16) / bands.length);
    bands.forEach((c, k) => g.fillStyle(c).fillRect(0, k * bandH, W, bandH));
    const sea = this.add.tileSprite(0, shore - 16, W, 16, 'water').setOrigin(0).setTint(PAL.teal);
    this.tweens.add({ targets: sea, tilePositionX: 32, duration: 5000, repeat: -1 });
    for (let y = shore; y < H; y += 16) for (let x = 0; x < W; x += 16) this.add.image(x, y, 'sand').setOrigin(0).setTint(PAL.khaki);
    this.add.sprite(Math.floor(W / 2), Math.floor(H * 0.68), 'player', 8);
  }
}
