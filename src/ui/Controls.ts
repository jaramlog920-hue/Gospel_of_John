// 키보드(방향키·WASD)와 터치(누르고 있는 곳으로 걷기)를 하나로 묶는다.
import Phaser from 'phaser';

export class Controls {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private action: Phaser.Input.Keyboard.Key[];
  /** 대화·두루마리가 열려 있으면 true. 이동과 조사를 막는다. */
  busy = false;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.action = [kb.addKey('SPACE'), kb.addKey('ENTER'), kb.addKey('Z')];
  }

  /** 이동 방향(길이 0~1). from은 플레이어의 월드 좌표 */
  move(from: { x: number; y: number }): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2(0, 0);
    if (this.busy) return v;
    const k = this.keys;
    if (k.LEFT.isDown || k.A.isDown) v.x -= 1;
    if (k.RIGHT.isDown || k.D.isDown) v.x += 1;
    if (k.UP.isDown || k.W.isDown) v.y -= 1;
    if (k.DOWN.isDown || k.S.isDown) v.y += 1;
    const p = this.scene.input.activePointer;
    if (v.lengthSq() === 0 && p.isDown) {
      const world = this.scene.cameras.main.getWorldPoint(p.x, p.y);
      const d = new Phaser.Math.Vector2(world.x - from.x, world.y - from.y);
      if (d.length() > 4) v.copy(d);
    }
    return v.lengthSq() > 0 ? v.normalize() : v;
  }

  actionPressed(): boolean {
    return !this.busy && this.action.some((k) => Phaser.Input.Keyboard.JustDown(k));
  }

  /** busy 동안 fn을 실행한다. 대화·두루마리를 열 때 쓴다. */
  async modal<T>(fn: () => Promise<T>): Promise<T> {
    this.busy = true;
    try {
      return await fn();
    } finally {
      // 대화를 닫은 입력이 곧바로 이동이나 조사로 이어지지 않게 한 박자 쉰다.
      this.scene.time.delayedCall(150, () => (this.busy = false));
      this.action.forEach((k) => k.reset());
    }
  }
}
