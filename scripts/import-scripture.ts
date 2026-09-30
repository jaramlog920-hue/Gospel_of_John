// 대한성서공회 온라인 성경(개역한글, 판 코드 HAN)에서 요한복음 21장을 가져와 data/john_krv.json을 만든다.
// 본문 글자는 한 자도 고치지 않는다. 걷어 내는 것은 본문이 아닌 것뿐이다.
//   - 소제목(smallTitle), 난외주 번호("1)")와 난외주 내용("혹 도가" 등), HTML 태그
//   - HTML이 화면에 그릴 때처럼 문단 나눔과 연속된 공백은 한 칸으로, 절 앞뒤 공백은 없앤다.
// 출처와 가공 내용은 data/SOURCE.md 참고.
import { writeFileSync } from 'node:fs';
import { checkStructure, serialize, sha256, VERSES_PER_CHAPTER, type Verse } from './scripture-lib.ts';

const URL = (ch: number) => `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=HAN&book=jhn&chap=${ch}`;

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

export function parseChapter(html: string, ch: number): Verse[] {
  const start = html.indexOf('id="tdBible1"');
  if (start < 0) throw new Error(`${ch}장: 본문 영역을 찾지 못함`);
  let body = html.slice(start);
  // 본문이 아닌 것 걷어 내기
  body = body
    .replace(/<font class="smallTitle">[\s\S]*?<\/font>/g, '') // 소제목
    .replace(/<div id='D_[^']*'[\s\S]*?<\/div>/g, '') // 난외주 내용
    .replace(/<a class=comment[\s\S]*?<\/a>/g, ''); // 난외주 번호
  const parts = body.split(/<span class="number">(\d+)(?:&nbsp;)+<\/span>/);
  const verses: Verse[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const v = Number(parts[i]);
    // 다음 절 번호가 나올 때까지(마지막 절은 본문 영역의 끝 </div>까지)가 이 절이다.
    // 절 중간의 문단 나눔(<br />)은 화면에서처럼 한 칸 띄움으로 본다.
    const chunk = parts[i + 1].split(/<\/div>/)[0];
    const text = decode(chunk.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    verses.push({ ch, v, text });
  }
  return verses;
}

if (process.argv[1]?.endsWith('import-scripture.ts')) {
  const all: Verse[] = [];
  for (let ch = 1; ch <= VERSES_PER_CHAPTER.length; ch++) {
    const res = await fetch(URL(ch), { headers: { 'User-Agent': 'Mozilla/5.0 (GospelOfJohnGame scripture import)' } });
    if (!res.ok) throw new Error(`${ch}장 다운로드 실패: ${res.status}`);
    const verses = parseChapter(await res.text(), ch);
    if (verses.length !== VERSES_PER_CHAPTER[ch - 1]) throw new Error(`${ch}장 절 수 ${verses.length} (기대 ${VERSES_PER_CHAPTER[ch - 1]})`);
    all.push(...verses);
    console.log(`${ch}장 ${verses.length}절`);
    await new Promise((r) => setTimeout(r, 800)); // 서버에 부담을 주지 않게 쉬어 간다
  }
  const errors = checkStructure(all);
  if (errors.length) throw new Error(errors.join('\n'));
  const json = serialize(all);
  writeFileSync('data/john_krv.json', json);
  writeFileSync('data/john_krv.sha256', `${sha256(json)}  john_krv.json\n`);
  console.log(`${all.length}절 저장, sha256 ${sha256(json)}`);
}
