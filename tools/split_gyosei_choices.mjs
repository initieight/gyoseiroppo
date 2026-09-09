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

/**
 * 行政書士試験の科目別の問題番号。
 * 民法・憲法・商法・会社法は問題番号で法令が固定されている。
 */
const SUBJECTS = [
  { lawId: 'constitution',    name: '憲法',   qNums: [3, 4, 5, 6, 7] },
  { lawId: 'commercial_code', name: '商法',   qNums: [36] },
  { lawId: 'company_act',     name: '会社法', qNums: [37, 38, 39, 40] },
];

/**
 * 行政法（問8〜26）は問題番号と法令が対応していない。
 * 同じ問13でも年によって行政手続法だったり別の法令だったりする。
 * 設問文にほぼ必ず法令名が書かれているので、そこから判定する。
 *
 * 総論・一般原則・個別法（公文書管理法など）の問題は、
 * この11法令のいずれにも該当しないので取り込まない。
 */
const ADMIN_QNUMS = Array.from({ length: 19 }, (_, i) => i + 8); // 8〜26
const LAW_PATTERNS = [
  {
    lawId: 'admin_procedure', name: '行政手続法',
    // 法令名の明示
    re: /行政手続法|行手法/,
    // 法令名が出てこない場合に使う、その法律に固有の用語
    terms: /審査基準|処分基準|標準処理期間|聴聞|弁明の機会|意見公募|不利益処分|申請に対する処分|届出/,
  },
  {
    lawId: 'admin_appeal', name: '行政不服審査法',
    re: /行政不服審査法|行審法/,
    terms: /審査請求|再調査の請求|再審査請求|審理員|行政不服審査会|裁決|不服申立/,
  },
  {
    lawId: 'admin_litigation', name: '行政事件訴訟法',
    re: /行政事件訴訟法|行訴法/,
    terms: /取消訴訟|抗告訴訟|差止めの訴え|義務付け|無効等確認|当事者訴訟|民衆訴訟|機関訴訟|原告適格|訴えの利益|執行停止/,
  },
  {
    lawId: 'state_liability', name: '国家賠償法',
    re: /国家賠償法|国家賠償|国賠法/,
    terms: /公権力の行使に当た|営造物|求償/,
  },
  {
    lawId: 'admin_enforcement', name: '行政代執行法',
    re: /行政代執行法/,
    terms: /代執行|戒告|代執行令書/,
  },
  {
    lawId: 'local_autonomy', name: '地方自治法',
    re: /地方自治法|自治法/,
    terms: /普通地方公共団体|住民監査請求|住民訴訟|条例|地方公共団体の長|議会の議決|事務監査請求|直接請求|国又は都道府県の関与|法定受託事務|自治事務/,
  },
  { lawId: 'national_admin_org', name: '国家行政組織法', re: /国家行政組織法/, terms: /省令|外局|附属機関/ },
];

/**
 * 対象法令を判定する。
 *
 * まず設問文の法令名を見る。法令名が書かれていない問題も多いので、
 * その場合は設問と肢の全文を、その法律に固有の用語で判定する。
 * 固有語での判定は設問文の法令名より弱いので、法令名で決まった場合はそちらを優先する。
 */
function detectLaws(stem, fullText) {
  const byName = LAW_PATTERNS.filter(p => p.re.test(stem)).map(p => p.lawId);
  if (byName.length) return byName;
  return LAW_PATTERNS.filter(p => p.terms && p.terms.test(fullText)).map(p => p.lawId);
}

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

  // ── 行政法（問8〜26）──
  const adminRows = {};
  const unmatched = [];
  let adminQ = 0;
  let splitFail = 0;
  for (const y of YEARS) {
    const qs = splitQuestions(ex[y] ?? []);
    for (const n of ADMIN_QNUMS) {
      const t = qs[n];
      if (!t) continue;
      adminQ++;
      const sp = splitChoices(t);
      if (!sp) { splitFail++; continue; }
      const laws = detectLaws(sp.stem, t);
      if (laws.length === 0) {
        unmatched.push(`${y.toUpperCase()}-Q${n}: ${sp.stem.slice(0, 34)}`);
        continue;
      }
      for (const lawId of laws) {
        (adminRows[lawId] ??= []);
        for (const c of sp.choices) {
          adminRows[lawId].push({
            qId: `${y.toUpperCase()}-Q${n}`,
            year: y.toUpperCase(),
            qNum: `Q${n}`,
            choice: c.label,
            stem: sp.stem.slice(0, 220),
            text: c.text.slice(0, 420),
            multiLaw: laws.length > 1,
          });
        }
      }
    }
  }
  console.log(`
行政法（問8〜26）: ${adminQ}問を走査`);
  for (const p of LAW_PATTERNS) {
    const rows = adminRows[p.lawId] ?? [];
    if (!rows.length) { console.log(`  ${p.name.padEnd(8)} 該当なし`); continue; }
    const qn = new Set(rows.map(r => r.qId));
    await writeFile(
      path.join(OUT, `gyosei_choices_${p.lawId}.json`),
      JSON.stringify({ lawId: p.lawId, rows }, null, 2),
      'utf-8',
    );
    console.log(`  ${p.name.padEnd(8)} ${String(qn.size).padStart(3)}問 / ${String(rows.length).padStart(4)}肢`);
  }
  console.log(`  肢に分解できず ${splitFail}問 / 法令を特定できず ${unmatched.length}問`);
  for (const u of unmatched.slice(0, 12)) console.log(`    ${u}`);
  if (unmatched.length > 12) console.log(`    … ほか${unmatched.length - 12}問`);
};

main().catch(e => { console.error(e); process.exit(1); });
