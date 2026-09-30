// 게임 흐름을 따라 다음 장면으로 넘어간다. 지금 단계는 저장해서 "이어하기"에 쓴다.
import Phaser from 'phaser';
import { Save } from '../state/save.ts';
import { FLOW } from './flow.ts';

export function startStep(scene: Phaser.Scene, index: number) {
  const i = Phaser.Math.Clamp(index, 0, FLOW.length - 1);
  Save.data.step = i;
  Save.write();
  const { scene: key, ...data } = FLOW[i];
  scene.scene.start(key, data);
}

/** 지금 장면을 마치고 다음 단계로 */
export function goNext(scene: Phaser.Scene) {
  startStep(scene, (Save.data.step ?? 0) + 1);
}
