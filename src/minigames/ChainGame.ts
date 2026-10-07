// 4장 수가: 여자가 마을로 달려간 뒤, 주인공도 마을을 돌며 사람들을 불러 우물로 데려온다.
// 따라오는 사람이 줄지어 길어지는 재미(설계 문서 4장). 마을 사람들은 가상 인물이며 말하지 않는다.
import Phaser from 'phaser';
import { PAL, WORLD as WC } from '../art/palette.ts';
import { faceAndWalk, grassTile } from '../art/textures.ts';
import { Sfx } from '../audio/sfx.ts';
import { MiniGame } from './MiniGame.ts';

const WORLD = 560;
const NEED = 6;

interface Villager {
  s: Phaser.GameObjects.Sprite;
  key: string;
  following: boolean;
  mark: Phaser.GameObjects.Image;
}

export class ChainGame extends MiniGame {
  readonly title = '우물로 오세요';
  readonly howTo = '마을 사람들에게 다가가면 나를 따라온다. 여섯 사람을 모아 왼쪽 끝 우물까지 함께 가자.';

  private player!: Phaser.GameObjects.Sprite;
  private villagers: Villager[] = [];
  private trail: { x: number; y: number }[] = [];
  private top = 60;
  private playing = false;

  constructor() {
    super('Chain');
  }

  protected build() {
    const { H } = this;
    this.villagers = [];
    this.trail = [];
    this.playing = false;
    this.top = Math.floor(H * 0.32);
    this.cameras.main.setBackgroundColor(WC.skyNoon[1]);
    const g = this.add.graphics();
    g.fillStyle(PAL.olive).fillRect(0, this.top - 24, WORLD, 24);
    const rt = this.add.renderTexture(0, this.top, WORLD, H - this.top).setOrigin(0);
    rt.beginDraw();
    for (let y = 0; y < H - this.top; y += 16) for (let x = 0; x < WORLD; x += 16) rt.batchDraw(x > 320 ? 'dirt' : grassTile(x, y), x, y);
    rt.endDraw();
    this.add.image(40, this.yAt(0.4), 'well').setDepth(this.yAt(0.4));
    for (let x = 340; x < WORLD; x += 70) this.add.image(x, this.top + 2, 'house').setOrigin(0.5, 1);
    // 모을 사람 수만큼만 둔다(사용자 요청 2026-10-04: 여섯 명을 모으라는데 일곱 명이 있었다).
    for (let i = 0; i < NEED; i++) {
      const key = `crowd${i % 6}`;
      const s = this.add.sprite(330 + i * 32, this.yAt(((i * 41) % 90) / 100 + 0.05), key, 0);
      s.setDepth(s.y);
      const mark = this.add.image(s.x, s.y - 20, 'bubble').setScale(0.6).setDepth(900);
      this.villagers.push({ s, key, following: false, mark });
    }
    this.player = this.add.sprite(70, this.yAt(0.5), 'player', 8);
    this.cameras.main.setBounds(0, 0, WORLD, H).startFollow(this.player, true, 1, 1);
  }

  private yAt(f: number) {
    return Math.round(this.top + 14 + f * (this.H - this.top - 24));
  }

  protected begin() {
    this.playing = true;
    this.status();
  }

  private status() {
    this.setStatus(`따라오는 사람 ${this.villagers.filter((v) => v.following).length}/${NEED}`);
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    const p = this.player;
    const v = this.controls.move(p);
    const step = 60 * (delta / 1000);
    p.x = Phaser.Math.Clamp(p.x + v.x * step, 16, WORLD - 10);
    p.y = Phaser.Math.Clamp(p.y + v.y * step, this.top + 10, this.H - 8);
    faceAndWalk(p, 'player', v.x, v.y);
    p.setDepth(p.y);
    if (v.lengthSq() > 0) this.trail.unshift({ x: p.x, y: p.y });
    this.trail.length = Math.min(this.trail.length, 400);

    // 따라오는 사람들은 주인공이 지나간 길을 줄지어 밟는다.
    let n = 0;
    for (const vg of this.villagers) {
      if (vg.following) {
        n++;
        const pt = this.trail[Math.min(this.trail.length - 1, n * 14)];
        if (pt) {
          const dx = pt.x - vg.s.x;
          const dy = pt.y - vg.s.y;
          vg.s.setPosition(pt.x, pt.y).setDepth(pt.y);
          faceAndWalk(vg.s, vg.key, Math.abs(dx) > 0.2 ? dx : 0, Math.abs(dy) > 0.2 ? dy : 0);
        }
      } else if (Phaser.Math.Distance.Between(p.x, p.y, vg.s.x, vg.s.y) < 18 && n < NEED) {
        vg.following = true;
        vg.mark.destroy();
        Sfx.good();
        this.status();
      }
    }
    const count = this.villagers.filter((x) => x.following).length;
    if (count >= NEED && p.x < 70) {
      this.playing = false;
      faceAndWalk(p, 'player', 0, 0);
      this.villagers.forEach((x) => x.following && faceAndWalk(x.s, x.key, 0, 0));
      this.complete();
    }
  }
}
