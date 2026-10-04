// 세로 화면용 가상 패드. 게임 화면 아래 빈 공간에 방향 패드와 확인 버튼을 둔다.
// 누르면 키보드 이벤트(방향키·엔터)를 흉내 내므로, 게임 코드는 키보드 조작만 알면 된다.

type Dir = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const KEY_CODES: Record<string, number> = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13, Escape: 27 };

/** 누른 느낌을 주는 짧은 진동(지원하는 기기만, 주로 안드로이드) */
function buzz(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // 진동을 막은 브라우저에서는 조용히 넘어간다.
  }
}

function sendKey(type: 'keydown' | 'keyup', code: string) {
  const e = new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true });
  // Phaser는 keyCode로 키를 구분하는데, 생성자에서는 keyCode를 넣을 수 없다.
  Object.defineProperty(e, 'keyCode', { get: () => KEY_CODES[code] });
  Object.defineProperty(e, 'which', { get: () => KEY_CODES[code] });
  window.dispatchEvent(e);
}

export function mountVirtualPad(container: HTMLElement) {
  container.innerHTML = `
    <div class="pad-dpad" aria-label="방향 패드">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d="M34 2h32v32h32v32H66v32H34V66H2V34h32z" fill="#2f4b55" transform="translate(0 5)" />
        <path d="M34 2h32v32h32v32H66v32H34V66H2V34h32z" fill="#2f4b55" />
        <path d="M37 5h26v32h32v26H63v32H37V63H5V37h32z" fill="#7e7c88" />
        <path d="M37 5h26v3H37zM5 37h32v3H5zM63 37h32v3H63z" fill="#a3a0ad" />
        <rect x="44" y="44" width="12" height="12" fill="#46606b" />
        <path class="arrow up" d="M50 12l8 10H42z" />
        <path class="arrow down" d="M50 88l-8-10h16z" />
        <path class="arrow left" d="M12 50l10-8v16z" />
        <path class="arrow right" d="M88 50l-10 8V42z" />
      </svg>
    </div>
    <button class="pad-menu" aria-label="메뉴">메뉴</button>
    <button class="pad-a" aria-label="확인">확인</button>
  `;
  const dpad = container.querySelector<HTMLElement>('.pad-dpad')!;
  const a = container.querySelector<HTMLElement>('.pad-a')!;

  // 방향 패드: 누른 채 손가락을 옮기면 방향이 바뀌고, 대각선도 된다.
  const held = new Set<Dir>();
  let activeId: number | null = null;
  const setDirs = (next: Set<Dir>) => {
    for (const d of held) if (!next.has(d)) (held.delete(d), sendKey('keyup', d));
    let pressed = false;
    for (const d of next) if (!held.has(d)) (held.add(d), sendKey('keydown', d), (pressed = true));
    if (pressed) buzz(6);
    dpad.dataset.dirs = [...held].join(' ');
  };
  const dirsAt = (e: PointerEvent) => {
    const r = dpad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dead = r.width * 0.12;
    const next = new Set<Dir>();
    if (Math.hypot(dx, dy) < dead) return next;
    const angle = Math.atan2(dy, dx); // 오른쪽 0, 아래 +
    const oct = Math.round(angle / (Math.PI / 4)); // -4..4
    if ([-1, 0, 1].includes(oct)) next.add('ArrowRight');
    if ([3, 4, -4, -3].includes(oct)) next.add('ArrowLeft');
    if ([1, 2, 3].includes(oct)) next.add('ArrowDown');
    if ([-1, -2, -3].includes(oct)) next.add('ArrowUp');
    return next;
  };
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    activeId = e.pointerId;
    dpad.setPointerCapture(e.pointerId);
    setDirs(dirsAt(e));
  });
  dpad.addEventListener('pointermove', (e) => e.pointerId === activeId && setDirs(dirsAt(e)));
  const release = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    setDirs(new Set());
  };
  dpad.addEventListener('pointerup', release);
  dpad.addEventListener('pointercancel', release);

  // 확인 버튼 = 엔터(대화 넘기기, 말 걸기, 선택)
  a.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    a.classList.add('down');
    buzz();
    sendKey('keydown', 'Enter');
  });
  const up = () => {
    if (!a.classList.contains('down')) return;
    a.classList.remove('down');
    sendKey('keyup', 'Enter');
  };
  a.addEventListener('pointerup', up);
  a.addEventListener('pointercancel', up);
  a.addEventListener('pointerleave', up);

  // 메뉴 버튼 = Esc(일시정지 메뉴)
  const menu = container.querySelector<HTMLElement>('.pad-menu')!;
  menu.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    buzz();
    sendKey('keydown', 'Escape');
    sendKey('keyup', 'Escape');
  });

  // 화면을 돌리거나 앱을 벗어나면 눌린 키를 모두 뗀다.
  const releaseAll = () => {
    setDirs(new Set());
    up();
  };
  window.addEventListener('blur', releaseAll);
  window.matchMedia('(orientation: portrait)').addEventListener('change', releaseAll);
}
