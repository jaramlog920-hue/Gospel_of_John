import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Galmuri BDF에서 글자별 폭(px)을 읽는다. */
export function loadBdfWidths(file: string): Map<number, number> {
  const widths = new Map<number, number>();
  let code = -1;
  for (const line of readFileSync(file, 'latin1').split('\n')) {
    if (line.startsWith('ENCODING ')) code = Number(line.slice(9));
    else if (line.startsWith('DWIDTH ') && code >= 0) {
      widths.set(code, Number(line.split(' ')[1]));
      code = -1;
    }
  }
  return widths;
}

export function listFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}
