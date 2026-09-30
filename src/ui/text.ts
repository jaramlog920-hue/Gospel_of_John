// 글자는 갈무리 BDF에서 만든 비트맵 폰트로 그린다(scripts/build-fonts.ts).
// 도트를 그대로 찍으므로 어느 기기에서나 번지지 않는다.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';

export type Font = 'body' | 'ui';

/** body: 갈무리11(본문·제목), ui: 갈무리9(안내·대화) */
export const FONT_KEY: Record<Font, string> = { body: 'galmuri11', ui: 'galmuri9' };
export const DEPTH_UI = 1000;

const advances: Partial<Record<Font, Map<number, number>>> = {};

/** 부트 씬에서 폰트를 불러온 뒤 한 번 호출한다. 글자 폭을 기억해 둔다. */
export function registerFontMetrics(scene: Phaser.Scene) {
  for (const font of Object.keys(FONT_KEY) as Font[]) {
    const data = scene.cache.bitmapFont.get(FONT_KEY[font]).data as { chars: Record<number, { xAdvance: number }> };
    advances[font] = new Map(Object.entries(data.chars).map(([code, c]) => [Number(code), c.xAdvance]));
  }
}

/** 화면에 그릴 때와 같은 폭(px)을 잰다. */
export function measurer(font: Font) {
  return (s: string) => {
    const map = advances[font];
    let w = 0;
    for (const ch of s) w += map?.get(ch.codePointAt(0)!) ?? 0;
    return w;
  };
}

/** 비트맵 글자. color는 팔레트 색. */
export function bt(scene: Phaser.Scene, x: number, y: number, text: string, color: number = PAL.white, font: Font = 'ui') {
  return scene.add.bitmapText(x, y, FONT_KEY[font], text).setTint(color);
}

interface TagStyle {
  fg?: number;
  bg?: number;
  font?: Font;
  padX?: number;
  padY?: number;
  originX?: number;
  originY?: number;
  border?: number;
}

/** 배경 상자가 있는 글자(버튼·안내 문구·참조 칩). */
export class Tag extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.BitmapText;
  private style: Required<TagStyle>;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, style: TagStyle = {}) {
    super(scene, x, y);
    this.style = { fg: PAL.white, bg: PAL.ink, font: 'ui', padX: 5, padY: 3, originX: 0, originY: 0, border: -1, ...style };
    this.bg = scene.add.rectangle(0, 0, 1, 1, this.style.bg).setOrigin(0);
    if (this.style.border >= 0) this.bg.setStrokeStyle(1, this.style.border);
    this.label = bt(scene, 0, 0, '', this.style.fg, this.style.font);
    this.add([this.bg, this.label]);
    this.setLabel(text);
    scene.add.existing(this);
  }

  setLabel(text: string) {
    const { padX, padY, originX, originY, font } = this.style;
    this.label.setText(text);
    const lineH = font === 'body' ? 11 : 9;
    const lines = text.split('\n').length;
    const w = Math.max(...text.split('\n').map(measurer(font))) + padX * 2;
    const h = lineH * lines + (lines - 1) * 3 + padY * 2;
    this.label.setLineSpacing(3);
    const ox = -Math.round(w * originX);
    const oy = -Math.round(h * originY);
    this.bg.setPosition(ox, oy).setSize(w, h);
    // 글자 상자의 윗여백(yoffset)을 빼서 한글이 상자 가운데 오게 한다.
    this.label.setPosition(ox + padX, oy + padY - (font === 'body' ? 3 : 2));
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(ox, oy, w, h), Phaser.Geom.Rectangle.Contains);
    return this;
  }

  /** 기준점(0 왼쪽·위 ~ 1 오른쪽·아래)을 바꾼다. */
  setAnchor(originX: number, originY: number) {
    this.style.originX = originX;
    this.style.originY = originY;
    return this.setLabel(this.label.text);
  }

  get boxWidth() {
    return this.bg.width;
  }
}

/** 누르기(터치·클릭·스페이스·엔터·Z)를 한 번 기다린다. 여는 순간의 입력은 무시한다. */
export function waitPress(scene: Phaser.Scene): Promise<void> {
  return new Promise((resolve) => {
    scene.time.delayedCall(120, () => {
      const done = () => {
        scene.input.off('pointerdown', done);
        scene.input.keyboard?.off('keydown', onKey);
        resolve();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') done();
      };
      scene.input.on('pointerdown', done);
      scene.input.keyboard?.on('keydown', onKey);
    });
  });
}
