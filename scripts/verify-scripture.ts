// 빌드 전 본문 검증. 해시나 구조가 다르면 종료 코드 1로 빌드(와 Vercel 배포)를 멈춘다.
import { readFileSync } from 'node:fs';
import { checkStructure, serialize, sha256, type Verse } from './scripture-lib.ts';

const content = readFileSync('data/john_krv.json');
const expected = readFileSync('data/john_krv.sha256', 'utf8').split(/\s+/)[0];
const actual = sha256(content);
const errors: string[] = [];

if (actual !== expected) errors.push(`해시 불일치\n  기대: ${expected}\n  실제: ${actual}`);

const verses = JSON.parse(content.toString('utf8')) as Verse[];
errors.push(...checkStructure(verses));
if (serialize(verses) !== content.toString('utf8')) errors.push('파일 형식이 표준 직렬화와 다름');

if (errors.length) {
  console.error('✗ 본문 검증 실패\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`✓ 본문 검증 통과 (${verses.length}절, sha256 ${actual.slice(0, 12)}…)`);
