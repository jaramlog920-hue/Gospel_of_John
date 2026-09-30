import Phaser from 'phaser';
import { generateTextures } from '../art/textures.ts';
import { FONT_SCRIPTURE, FONT_UI, SIZE_SCRIPTURE, SIZE_UI } from '../ui/layout.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  async create() {
    // 폰트가 준비되기 전에 글자를 그리면 대체 폰트로 굳어 버린다.
    await Promise.all([
      document.fonts.load(`${SIZE_SCRIPTURE}px ${FONT_SCRIPTURE}`, '가'),
      document.fonts.load(`${SIZE_UI}px ${FONT_UI}`, '가'),
    ]).catch(() => undefined);
    generateTextures(this);
    const params = new URLSearchParams(location.search);
    const start = params.get('scene');
    // 개발·확인용: ?scene=Ch6&checkpoint=rush 처럼 장면과 이어하기 지점을 바로 열 수 있다.
    const data = Object.fromEntries([...params].filter(([k]) => k !== 'scene'));
    this.scene.start(start && this.scene.manager.keys[start] ? start : 'Title', data);
  }
}
