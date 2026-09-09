#!/usr/bin/env node
/**
 * 行政書士試験の過去問を、法令別・選択肢単位に切り出す。
 *
 *   node tools/split_gyosei_choices.mjs
 *
 * 憲法・商法・会社法には民法のような選択肢単位のデータが存在しないため、
 * 判定にかける前段として問題文を肢に分解する。
 *
 * ■ 機械マッチで条文を割り当てないこと
 *   条文本文と問題文の3-gram一致で割り当てを試したが、
 *   会社法で1問あたり15.5条、商法で9.8条に膨らんだ。
 *   条文の文言が定型的で偶然一致するため。
 *   民法で修正したブロック展開バグと同じものになるので、この方向は捨てた。
 *   肢に分解したうえで、1肢ずつ判定する。
 *
 * 出力: tools/out/gyosei_choices_{lawId}.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const YEARS = ['r2', 'r3', 'r4', 'r5', 'r6', 'r7'];

/** 行政書士試験の科目別の問題番号 */
const SUBJECTS = [
  { lawId: 'constitution',    name: '憲法',   qNums: [3, 4, 5, 6, 7] },
  { lawId: 'commercial_code', name: '商法',   qNums: [36] },
  { lawId: 'company_act',     name: '会社法', qNums: [37, 38, 39, 40] },
];

const KANA = 'アイウエオ';

/** 1年分のテキストを問題番号ごとに切る */
function splitQuestions(pages) {
  const txt = pages.map(p => p.text).join('\n');
  const seen = new Set();
  const idx = [];
  for (const m of txt.matchAll(/問題\s*(\d{1,2})/g)) {
    const n = Number(m[1]);
    if (seen.has(n)) continue;
    seen.add(n);
    idx.push({ n, i: m.index });
  }
  idx.sort((a, b) => a.i - b.i);
  const out = {};
  idx.forEach((x, j) => {
    out[x.n] = txt.slice(x.i, j + 1 < idx.length ? idx[j + 1].i : undefined);
  });
  return out;
}

/** 問題文を「設問」と「肢」に分解する */
function splitChoices(questionText) {
  const t = String(questionText).replace(/\r/g, '');
  const marks = [];
  // 数字選択肢 1〜5
  for (let n = 1; n <= 5; n++) {
    const m = new RegExp(String.raw`(?:^|\n)[ \t　]*${n}[ \t　]`).exec(t);
    if (m) marks.push({ label: String(n), i: m.index + m[0].length, kind: 'num' });
  }
  // カタカナ選択肢 ア〜オ
  for (const k of KANA) {
    const m = new RegExp(String.raw`(?:^|\n)[ \t　]*${k}[ \t　]`).exec(t);
    if (m) marks.push({ label: k, i: m.index + m[0].length, kind: 'kana' });
  }
  // 同じ問題に両方の形式が混ざることはないので、多いほうを採用
  const num = marks.filter(m => m.kind === 'num');
  const kana = marks.filter(m => m.kind === 'kana');
  const used = (kana.length >= 3 ? kana : num).sort((a, b) => a.i - b.i);
  if (used.length < 3) return null;

  const stem = t.slice(0, used[0].i).replace(/\s+/g, ' ').trim();
  // 空欄補充（語句の組合せを選ぶ形式）は条文に割り当てる意味がないので除外
  if (/空欄|当てはまる語句|語句の組合せ/.test(stem)) return null;
  const choices = used.map((m, j) => ({
    label: m.label,
    text: t
      .slice(m.i, j + 1 < used.length ? used[j + 1].i : undefined)
      .replace(/\s+/g, ' ')
      // 末尾に残る次の肢のマーカー（ア〜オ）とページ番号を落とす
      .replace(/[ 　]*[アイウエオ][ 　]*$/, '')
      .replace(/[ 　]*\d{1,3}[ 　]*$/, '')
      .replace(/[ 　]*[1-5][ 　]*[アイウエオ][・･][アイウエオ].*$/, '')
      .trim(),
  }));
  return { stem, choices };
}

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const ex = JSON.parse(await readFile(path.join(HERE, 'data/all_exam_pages.json'), 'utf-8'));

  for (const s of SUBJECTS) {
    const rows = [];
    const missing = [];
    for (const y of YEARS) {
      const qs = splitQuestions(ex[y] ?? []);
      for (const n of s.qNums) {
        const t = qs[n];
        if (!t) { missing.push(`${y.toUpperCase()}-Q${n}`); continue; }
        const sp = splitChoices(t);
        if (!sp) { missing.push(`${y.toUpperCase()}-Q${n}（肢に分解できず）`); continue; }
        for (const c of sp.choices) {
          rows.push({
            qId: `${y.toUpperCase()}-Q${n}`,
            year: y.toUpperCase(),
            qNum: `Q${n}`,
            choice: c.label,
            stem: sp.stem.slice(0, 220),
            text: c.text.slice(0, 420),
          });
        }
      }
    }
    const qs = new Set(rows.map(r => r.qId));
    await writeFile(
      path.join(OUT, `gyosei_choices_${s.lawId}.json`),
      JSON.stringify({ lawId: s.lawId, rows }, null, 2),
      'utf-8',
    );
    console.log(`${s.name.padEnd(4)} ${qs.size}問 / ${rows.length}肢` +
      (missing.length ? `  取得できず: ${missing.join(', ')}` : ''));
  }
};

main().catch(e => { console.error(e); process.exit(1); });
