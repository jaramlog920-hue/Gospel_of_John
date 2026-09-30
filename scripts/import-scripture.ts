// 위키문헌 「개역한글판/요한복음」 고정 판(revision)에서 본문을 가져와 data/john_krv.json을 만든다.
// 본문은 앞뒤 공백만 걷어내고 한 글자도 고치지 않는다. 출처는 data/SOURCE.md 참고.
import { writeFileSync } from 'node:fs';
import { checkStructure, serialize, sha256, type Verse } from './scripture-lib.ts';

const REVISION = 394018;
const url =
  'https://ko.wikisource.org/w/index.php?title=' +
  encodeURIComponent('개역한글판/요한복음') +
  `&action=raw&oldid=${REVISION}`;

const res = await fetch(url, { headers: { 'User-Agent': 'GospelOfJohnGame/0.1' } });
if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
const raw = await res.text();

const verses: Verse[] = [];
let ch = 0;
for (const line of raw.split('\n')) {
  const head = /^== (\d+)장 ==$/.exec(line);
  if (head) {
    ch = Number(head[1]);
    continue;
  }
  // {{절|장|}} 은 그 장의 1절, {{절||절}} 은 나머지 절
  const m = /^\{\{절\|(\d*)\|(\d*)\}\}(.*)$/.exec(line);
  if (!m) continue;
  const [, c, v, text] = m;
  if (c && Number(c) !== ch) throw new Error(`장 번호 불일치: ${line}`);
  verses.push({ ch, v: c ? 1 : Number(v), text: text.trim() });
}

const errors = checkStructure(verses);
if (errors.length) throw new Error(errors.join('\n'));

const json = serialize(verses);
writeFileSync('data/john_krv.json', json);
writeFileSync('data/john_krv.sha256', `${sha256(json)}  john_krv.json\n`);
console.log(`${verses.length}절 저장, sha256 ${sha256(json)}`);
