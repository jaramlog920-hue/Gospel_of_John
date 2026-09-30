import Phaser from 'phaser';
import { generateTextures } from '../art/textures.ts';
import { FONT_KEY, registerFontMetrics } from '../ui/text.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 비트맵 폰트(scripts/build-fonts.ts가 만든 파일)
    for (const key of Object.values(FONT_KEY)) this.load.bitmapFont(key, `assets/fonts/gen/${key}.png`, `assets/fonts/gen/${key}.xml`);
  }

  create() {
    registerFontMetrics(this);
    generateTextures(this);
    const params = new URLSearchParams(location.search);
    const start = params.get('scene');
    // 개발·확인용: ?scene=Ch6&checkpoint=rush 처럼 장면과 이어하기 지점을 바로 열 수 있다.
    const data = Object.fromEntries([...params].filter(([k]) => k !== 'scene'));
    this.scene.start(start && this.scene.manager.keys[start] ? start : 'Title', data);
  }
}
