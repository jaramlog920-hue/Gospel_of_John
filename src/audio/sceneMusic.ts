// 장면마다 어떤 배경음을 틀지 정한다. 장면이 시작될 때 main.ts가 부른다.
import type Phaser from 'phaser';
import { STORIES } from '../story/stories.ts';
import { Music, type TrackId } from './music.ts';

/** 소리를 듣고 푸는 미니게임: 배경음을 잠시 끈다(9장 물소리, 10장 목자의 부름). */
const LISTENING = ['Blind', 'Voice'];
/** 위에 잠깐 떠서 아래 장면의 곡을 그대로 두는 장면 */
const OVERLAY = ['Boot', 'Pause'];

interface Choice {
  id: TrackId | null;
  sparse?: boolean;
}

export function musicForScene(key: string, data: Record<string, unknown> | undefined): Choice | undefined {
  if (OVERLAY.includes(key)) return undefined;
  if (LISTENING.includes(key)) return { id: null };
  if (['Title', 'Diary', 'End', 'Campfire', 'ChapterQuiz', 'Ch1'].includes(key)) return { id: 'come' };
  if (key === 'Ch6') return { id: 'road' };
  if (key === 'Story') {
    const st = STORIES[String(data?.id ?? '')];
    if (!st) return { id: 'road' };
    // 수난 장면(원칙 6): 선율 없이 아주 작게
    if (st.solemn) return { id: 'night', sparse: true };
    if (st.ch >= 13 && st.ch <= 19) return { id: 'night' };
    return { id: 'road' };
  }
  // 그 밖의 미니게임은 이야기 장면의 곡을 이어 간다.
  return undefined;
}

/** 모든 장면에 배경음 바꾸기를 건다. */
export function attachSceneMusic(game: Phaser.Game) {
  let base: Choice = { id: null };
  for (const s of game.scene.getScenes(false)) {
    const key = s.scene.key;
    s.events.on('start', () => {
      const c = musicForScene(key, s.sys.settings.data as Record<string, unknown>);
      if (!c) return;
      if (!LISTENING.includes(key)) base = c;
      Music.play(c.id, { sparse: c.sparse });
    });
    // 소리로 푸는 미니게임이 끝나면 이야기 장면의 곡으로 돌아간다.
    if (LISTENING.includes(key)) s.events.on('shutdown', () => Music.play(base.id, { sparse: base.sparse }));
  }
}
