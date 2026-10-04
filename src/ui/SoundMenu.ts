// "소리 설정" 화면(사용자 요청 2026-10-04). 배경음·효과음 크기를 끔·작게·보통·크게 중에서 고른다.
// 줄을 고를 때마다 한 단계씩 바뀌고, 바뀐 크기로 소리를 들려준다. 설정은 이 기기에 저장된다.
import type Phaser from 'phaser';
import { AudioSettingsStore, VOLUME_LABELS } from '../audio/engine.ts';
import { Sfx } from '../audio/sfx.ts';
import { choose } from './Dialog.ts';

export async function showSoundMenu(scene: Phaser.Scene) {
  let sel = 0;
  for (;;) {
    const s = AudioSettingsStore.get();
    const pick = await choose(scene, '소리 설정', [`배경음 · ${VOLUME_LABELS[s.music]}`, `효과음 · ${VOLUME_LABELS[s.sfx]}`, '돌아가기'], sel);
    sel = pick;
    if (pick === 0) AudioSettingsStore.set({ music: (s.music + 1) % VOLUME_LABELS.length });
    else if (pick === 1) {
      AudioSettingsStore.set({ sfx: (s.sfx + 1) % VOLUME_LABELS.length });
      Sfx.good();
    } else return;
  }
}
