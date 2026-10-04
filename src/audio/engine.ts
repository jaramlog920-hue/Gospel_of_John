// 소리 공통 바탕: AudioContext 하나와 배경음·효과음 볼륨 통로(버스). 음원 파일 없이 Web Audio로 만든다.
// 브라우저 정책 때문에 첫 터치·키 입력 뒤에야 소리가 난다(unlockAudio).

/** 볼륨 단계(설정 메뉴). "보통"이 원래 크기다. */
export const VOLUME_LABELS = ['끔', '작게', '보통', '크게'] as const;
const VOLUME_GAIN = [0, 0.45, 1, 1.6];

export interface AudioSettings {
  /** 배경음 단계(0~3) */
  music: number;
  /** 효과음 단계(0~3) */
  sfx: number;
}

const KEY = 'seven-signs:audio';
const settings: AudioSettings = { music: 2, sfx: 2 };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) Object.assign(settings, JSON.parse(raw));
} catch {
  // 저장이 막힌 곳에서도 기본값으로 소리는 난다.
}

let ctx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  musicBus = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus.connect(ctx.destination);
  sfxBus.connect(ctx.destination);
  applyVolumes();
  return ctx;
}

function applyVolumes() {
  if (!ctx || !musicBus || !sfxBus) return;
  const t = ctx.currentTime;
  musicBus.gain.setTargetAtTime(VOLUME_GAIN[settings.music] ?? 1, t, 0.05);
  sfxBus.gain.setTargetAtTime(VOLUME_GAIN[settings.sfx] ?? 1, t, 0.02);
}

/** 소리를 낼 수 있으면 AudioContext를, 아니면 null. 멈춰 있으면 깨운다. */
export function audio(): AudioContext | null {
  const a = ensure();
  if (a && a.state === 'suspended' && !document.hidden) void a.resume();
  return a;
}

/** 소리가 지금 실제로 나는 상태인가(첫 터치 전이면 false) */
export function audioRunning(): boolean {
  return ctx?.state === 'running';
}

export function musicOut(): AudioNode | null {
  return ensure() ? musicBus : null;
}

export function sfxOut(): AudioNode | null {
  return ensure() ? sfxBus : null;
}

export const AudioSettingsStore = {
  get(): Readonly<AudioSettings> {
    return settings;
  },
  set(next: Partial<AudioSettings>) {
    Object.assign(settings, next);
    applyVolumes();
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // 저장이 막혀도 이번 판에는 적용된다.
    }
  },
};

/** 첫 터치·키 입력에서 소리를 켜고, 탭을 떠나면 멈췄다가 돌아오면 다시 켠다. */
export function unlockAudio(onRunning: () => void) {
  const wake = () => {
    const a = audio();
    if (!a) return;
    if (a.state === 'running') onRunning();
    else void a.resume().then(onRunning, () => {});
  };
  for (const ev of ['pointerdown', 'keydown', 'touchend'])
    window.addEventListener(ev, wake, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume().then(onRunning, () => {});
  });
}
