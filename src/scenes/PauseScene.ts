// 일시정지 메뉴. 게임 중 어디서나 메뉴 버튼(세로 패드·가로 화면 모서리)이나 Esc로 연다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';
import { DIARY } from '../diary/index.ts';
import { Save } from '../state/save.ts';
import { showDiaryPage } from '../ui/DiaryPage.ts';
import { choose, say } from '../ui/Dialog.ts';
import { showSigns } from '../ui/SignsMenu.ts';
import { showSoundMenu } from '../ui/SoundMenu.ts';

/** 메뉴를 열 수 있는 장면 */
export const MINIGAMES = ['Jars', 'Herd', 'Lantern', 'Chain', 'Runner', 'Pool', 'Row', 'Lamps', 'Blind', 'Voice', 'Stone', 'Scent', 'Wash', 'Net'];
export const PAUSABLE = [...MINIGAMES, 'Ch1', 'Ch6', 'Story', 'Campfire'];

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  async create(data: { from: string }) {
    const from = data.from;
    const { width: W, height: H } = this.scale;
    this.add.rectangle(0, 0, W, H, PAL.ink, 0.6).setOrigin(0);

    for (;;) {
      const pick = await choose(this, '잠깐 멈춤', ['계속하기', '일곱 표적', '일기장', '소리 설정', '타이틀로']);
      if (pick === 0) break;
      if (pick === 1) {
        await showSigns(this);
        continue;
      }
      if (pick === 3) {
        await showSoundMenu(this);
        continue;
      }
      if (pick === 2) {
        const entries = [...Save.data.diary].sort((a, b) => a.ch - b.ch);
        if (entries.length === 0) {
          await say(this, null, '아직 쓴 일기가 없다. 표적을 보고 난 밤에 모닥불 앞에서 쓰게 된다.');
          continue;
        }
        const i = await choose(this, '일기장', [...entries.map((e) => `${e.ch}장 · ${DIARY[e.ch].title}`), '돌아가기']);
        if (i < entries.length) await showDiaryPage(this, entries[i], { typing: false, closeLabel: '닫기' });
        continue;
      }
      const sure = await choose(this, '지금 장면은 처음부터 다시 해요', ['돌아가기', '타이틀로 가기']);
      if (sure === 1) {
        // 미니게임 밑에 멈춰 있던 이야기 장면까지 모두 닫는다.
        for (const key of PAUSABLE) if (key !== from) this.scene.stop(key);
        this.scene.stop(from);
        this.scene.start('Title');
        return;
      }
    }
    this.scene.resume(from);
    this.scene.stop();
  }
}

/** 지금 진행 중인 장면을 멈추고 메뉴를 연다. */
export function openPauseMenu(game: Phaser.Game) {
  if (game.scene.isActive('Pause')) return;
  const from = PAUSABLE.find((key) => game.scene.isActive(key));
  if (!from) return;
  game.scene.pause(from);
  game.scene.start('Pause', { from });
  game.scene.bringToTop('Pause');
}
