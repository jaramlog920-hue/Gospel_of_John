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
    this.scene.start(start && this.scene.manager.keys[start] ? start : 'Title');
  }
}
