import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.ts';
import { CampfireScene } from './scenes/CampfireScene.ts';
import { Ch1LightScene } from './scenes/Ch1LightScene.ts';
import { Ch6FeedingScene } from './scenes/Ch6FeedingScene.ts';
import { DiaryScene } from './scenes/DiaryScene.ts';
import { EndScene } from './scenes/EndScene.ts';
import { TitleScene } from './scenes/TitleScene.ts';
import { GAME_HEIGHT, GAME_WIDTH } from './ui/layout.ts';
import { mountVirtualPad } from './ui/VirtualPad.ts';

mountVirtualPad(document.getElementById('pad')!);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1a1423',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [BootScene, TitleScene, Ch1LightScene, Ch6FeedingScene, CampfireScene, DiaryScene, EndScene],
});

// 화면을 돌리면 게임을 담는 칸 크기가 CSS로 바뀐다. 한 박자 뒤 다시 맞춘다.
const refit = () => requestAnimationFrame(() => game.scale.refresh());
window.addEventListener('resize', refit);
window.matchMedia('(orientation: portrait)').addEventListener('change', refit);
