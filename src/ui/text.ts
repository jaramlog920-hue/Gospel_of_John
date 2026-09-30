import Phaser from 'phaser';
import { css, PAL } from '../art/palette.ts';
import { FONT_SCRIPTURE, FONT_UI, SIZE_SCRIPTURE, SIZE_UI } from './layout.ts';

export const DEPTH_UI = 1000;

export function uiText(scene: Phaser.Scene, x: number, y: number, text: string, color: number = PAL.white, size = SIZE_UI) {
  return scene.add
    .text(x, y, text, { fontFamily: size >= SIZE_SCRIPTURE ? FONT_SCRIPTURE : FONT_UI, fontSize: `${size}px`, color: css(color) })
    .setScrollFactor(0)
    .setDepth(DEPTH_UI);
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** 화면에 그릴 때와 같은 폰트로 폭을 잰다. */
export function measurer(font: string, size: number) {
  measureCtx ??= document.createElement('canvas').getContext('2d')!;
  const ctx = measureCtx;
  return (s: string) => {
    ctx.font = `${size}px ${font}`;
    return Math.ceil(ctx.measureText(s).width);
  };
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

export const FONTS = { FONT_SCRIPTURE, FONT_UI };
