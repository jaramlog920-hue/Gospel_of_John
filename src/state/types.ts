export type Emotion = 'surprise' | 'fear' | 'joy' | 'doubt' | 'wonder';

export const EMOTIONS: readonly { key: Emotion; label: string }[] = [
  { key: 'surprise', label: '놀람' },
  { key: 'fear', label: '두려움' },
  { key: 'joy', label: '기쁨' },
  { key: 'doubt', label: '의심' },
  { key: 'wonder', label: '궁금함' },
];
