import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.ts';
import { CampfireScene } from './scenes/CampfireScene.ts';
import { Ch1LightScene } from './scenes/Ch1LightScene.ts';
import { Ch6FeedingScene } from './scenes/Ch6FeedingScene.ts';
import { DiaryScene } from './scenes/DiaryScene.ts';
import { EndScene } from './scenes/EndScene.ts';
import { openPauseMenu, PauseScene } from './scenes/PauseScene.ts';
import { TitleScene } from './scenes/TitleScene.ts';
import { computeView } from './ui/layout.ts';
import { mountVirtualPad } from './ui/VirtualPad.ts';

mountVirtualPad(document.getElementById('pad')!);

const parent = document.getElementById('game')!;

function measure() {
  const r = parent.getBoundingClientRect();
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  return computeView(r.width, r.height, window.devicePixelRatio || 1, portrait);
}

const view = measure();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: view.w,
  height: view.h,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#3d3656',
  scale: { mode: Phaser.Scale.NONE, zoom: view.zoom },
  input: { activePointers: 2 },
  scene: [BootScene, TitleScene, Ch1LightScene, Ch6FeedingScene, CampfireScene, DiaryScene, EndScene, PauseScene],
});

/** 화면 크기가 바뀌면 다시 그릴 때 넘길 이어하기 정보를 씬이 줄 수 있다. */
export interface Checkpointed {
  checkpoint(): object;
}

// 화면을 돌리거나 창 크기를 바꾸면 해상도를 다시 정하고, 지금 씬을 이어하기 지점부터 다시 그린다.
let timer = 0;
const refit = () => {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    const v = measure();
    const sizeChanged = v.w !== game.scale.width || v.h !== game.scale.height;
    if (sizeChanged) game.scale.resize(v.w, v.h);
    game.scale.setZoom(v.zoom);
    if (!sizeChanged) return;
    for (const s of game.scene.getScenes(true)) {
      if (s.scene.key === 'Boot') continue;
      const extra = 'checkpoint' in s ? (s as unknown as Checkpointed).checkpoint() : {};
      s.scene.restart({ ...s.sys.settings.data, ...extra });
    }
  }, 200);
};
window.addEventListener('resize', refit);
window.matchMedia('(orientation: portrait)').addEventListener('change', refit);

// 메뉴: Esc 키, 세로 패드의 메뉴 버튼, 가로 화면 모서리의 메뉴 버튼
window.addEventListener('keydown', (e) => e.code === 'Escape' && openPauseMenu(game));
document.getElementById('menu-btn')?.addEventListener('click', () => openPauseMenu(game));

// 확인용: ?debug 주소에서만 콘솔에서 게임 객체를 볼 수 있게 한다.
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { game: Phaser.Game }).game = game;
