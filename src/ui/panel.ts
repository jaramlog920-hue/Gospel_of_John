// 도트 UI 패널. 모든 상자(대화·선택지·두루마리·일기·상태 표시)가 같은 규칙으로 그려진다.
// 1px 외곽선 + 안쪽 밝은 테두리 + 1px 모서리 깎기 + 아래쪽 1px 그림자.
import Phaser from 'phaser';
import { PAL } from '../art/palette.ts';

export type PanelKind = 'dark' | 'paper' | 'light' | 'accent' | 'soft' | 'softOn';

const KINDS: Record<PanelKind, { fill: number; edge: number; hi: number; shadow: number }> = {
  dark: { fill: PAL.night, edge: PAL.ink, hi: PAL.indigo, shadow: PAL.ink },
  paper: { fill: PAL.cream, edge: PAL.rust, hi: PAL.white, shadow: PAL.clay },
  light: { fill: PAL.white, edge: PAL.ink, hi: PAL.white, shadow: PAL.stone },
  accent: { fill: PAL.teal, edge: PAL.ink, hi: PAL.aqua, shadow: PAL.pine },
  // 밝은 종이 단추(첫 화면 메뉴): 아래 조작판의 메뉴 단추와 같은 톤
  soft: { fill: PAL.white, edge: PAL.steel, hi: PAL.white, shadow: PAL.khaki },
  softOn: { fill: PAL.mint, edge: PAL.teal, hi: PAL.foam, shadow: PAL.khaki },
};

export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, kind: PanelKind = 'dark', alpha = 1) {
  const k = KINDS[kind];
  // 그림자
  g.fillStyle(k.shadow, alpha).fillRect(x + 1, y + h, w - 2, 1);
  // 외곽선(모서리 1px 깎기)
  g.fillStyle(k.edge, alpha);
  g.fillRect(x + 1, y, w - 2, 1).fillRect(x + 1, y + h - 1, w - 2, 1).fillRect(x, y + 1, 1, h - 2).fillRect(x + w - 1, y + 1, 1, h - 2);
  // 안쪽
  g.fillStyle(k.fill, alpha).fillRect(x + 1, y + 1, w - 2, h - 2);
  // 위·왼쪽 밝은 테두리
  g.fillStyle(k.hi, alpha).fillRect(x + 2, y + 1, w - 4, 1).fillRect(x + 1, y + 2, 1, h - 4);
  return g;
}

/** 깜빡이는 ▼ 표시(넘길 수 있음) */
export function nextArrow(scene: Phaser.Scene, x: number, y: number, color: number = PAL.gold) {
  const t = scene.add.triangle(x, y, 0, 0, 7, 0, 3.5, 4, color).setOrigin(0);
  scene.tweens.add({ targets: t, y: y + 2, duration: 380, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
  return t;
}
