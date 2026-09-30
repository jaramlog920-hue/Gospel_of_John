import Phaser from 'phaser';
import { generateTextures } from '../art/textures.ts';
import g11png from '../fonts-gen/galmuri11.png?url';
import g11xml from '../fonts-gen/galmuri11.xml?url';
import g9png from '../fonts-gen/galmuri9.png?url';
import g9xml from '../fonts-gen/galmuri9.xml?url';
import { FONT_KEY, registerFontMetrics } from '../ui/text.ts';

// 해시가 붙은 주소(scripts/build-fonts.ts 참고)
const FONT_FILES: Record<string, [string, string]> = {
  [FONT_KEY.body]: [g11png, g11xml],
  [FONT_KEY.ui]: [g9png, g9xml],
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 비트맵 폰트(scripts/build-fonts.ts가 만든 파일)
    for (const [key, [png, xml]] of Object.entries(FONT_FILES)) this.load.bitmapFont(key, png, xml);
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
