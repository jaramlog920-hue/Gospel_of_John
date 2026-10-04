import { describe, expect, it } from 'vitest';
import { noteFreq, parseMelody, trackOf, TRACK_IDS } from '../src/audio/music.ts';
import { musicForScene } from '../src/audio/sceneMusic.ts';

describe('배경음', () => {
  it('음 이름을 주파수로 바꾼다', () => {
    expect(noteFreq('A4')).toBeCloseTo(440);
    expect(noteFreq('A5')).toBeCloseTo(880);
    expect(noteFreq('C#5')).toBeCloseTo(554.37, 1);
  });

  it.each(TRACK_IDS)('%s: 선율 길이가 화음 마디 수와 맞고, 모든 음이 읽힌다', (id) => {
    const t = trackOf(id);
    const { steps, events } = parseMelody(t.melody);
    expect(steps).toBe(t.chords.length * 8);
    expect(events.length).toBeGreaterThan(0);
    for (const c of t.chords) {
      const notes = c.split(' ');
      expect(notes).toHaveLength(4);
      notes.forEach((n) => expect(noteFreq(n)).toBeGreaterThan(0));
    }
  });

  it('장면마다 곡을 고른다', () => {
    expect(musicForScene('Title', {})).toEqual({ id: 'come' });
    expect(musicForScene('Story', { id: '1b' })).toEqual({ id: 'road' });
    expect(musicForScene('Story', { id: '14' })).toEqual({ id: 'night' });
    // 수난 장면: 선율 없이 작게(설계 원칙 6)
    expect(musicForScene('Story', { id: '19a' })).toEqual({ id: 'night', sparse: true });
    // 소리로 푸는 미니게임은 배경음을 끈다
    expect(musicForScene('Blind', {})).toEqual({ id: null });
    // 일시정지와 다른 미니게임은 곡을 바꾸지 않는다
    expect(musicForScene('Pause', {})).toBeUndefined();
    expect(musicForScene('Jars', {})).toBeUndefined();
  });
});
