import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.ts';
import { CampfireScene } from './scenes/CampfireScene.ts';
import { Ch1LightScene } from './scenes/Ch1LightScene.ts';
import { Ch6FeedingScene } from './scenes/Ch6FeedingScene.ts';
import { DiaryScene } from './scenes/DiaryScene.ts';
import { EndScene } from './scenes/EndScene.ts';
import { TitleScene } from './scenes/TitleScene.ts';
import { GAME_HEIGHT, GAME_WIDTH } from './ui/layout.ts';

new Phaser.Game({
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
