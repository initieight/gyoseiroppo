#!/usr/bin/env node
/**
 * 別モデルに独立判定させるための「ブラインド」入力を作る。
 *
 *   node tools/make_blind_review.mjs
 *
 * こちらの割当は一切書かない。設問文と選択肢だけを渡し、
 * 白紙から根拠条文を答えてもらう。
 *
 * 3群を混ぜる（相手にはどれがどれか分からない）
 *   target  … 枝番へ付け替えた46件のうち、根拠が弱い20件
 *   fixed   … 枝番へ付け替えた確実な26件
 *   control … 選択肢本文に「第◯条」が明示されていて正解が確定している対照群
 *             → 相手の精度を測るために使う
 *
 * 出力
 *   Desktop/民法_ブラインド判定_入力.md   … そのまま貼れる入力
 *   tools/out/blind_answer_key.json       … 突き合わせ用（相手には渡さない）
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const DESKTOP = process.env.USERPROFILE + '/Desktop';
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const norm = s => (s ?? '').replace(/\s/g, '');

function overlap(a, b) {
  const A = norm(a);
  const B = norm(b);
  if (A.length < 6 || B.length < 6) return 0;
  const g = new Set();
  for (let i = 0; i <= A.length - 3; i++) g.add(A.slice(i, i + 3));
  if (!g.size) return 0;
  let hit = 0;
  for (const x of g) if (B.includes(x)) hit++;
  return hit / g.size;
}
const KANA = 'アイウエオ';

function extractChoice(questionText, choice) {
  if (!questionText || !choice) return '';
  const t = String(questionText).replace(/\r/g, '');
  const at = m => {
    const r = new RegExp(String.raw`(?:^|\n)[ \t　]*` + m + String.raw`[ \t　]`);
    const x = r.exec(t);
    return x ? x.index + x[0].length : -1;
  };
  if (/^[1-5]$/.test(choice)) {
    const n = Number(choice);
    const s = at(String(n));
    if (s < 0) return '';
    const e = n < 5 ? at(String(n + 1)) : -1;
    return t.slice(s, e > s ? e : undefined).trim();
  }
  const i = KANA.indexOf(choice);
  if (i < 0) return '';
  const s = at(KANA[i]);
  if (s < 0) return '';
  const e = i + 1 < KANA.length ? at(KANA[i + 1]) : -1;
  return t.slice(s, e > s ? e : undefined).trim();
}

/** 設問のリード文（最初の選択肢マーカーより前） */
function stem(questionText) {
  const t = String(questionText ?? '').replace(/\r/g, '');
  const m = /(?:^|\n)[ \t　]*(?:1|ア)[ \t　]/.exec(t);
  return (m ? t.slice(0, m.index) : t).replace(/\s+/g, ' ').trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const t = text.replace(/^\ufeff/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const main = async () => {
  const { rows, questionText } = await readJson(path.join(OUT, 'civil_choices.json'));
  const law = (await readJson(path.join(HERE, 'public/laws/civil_code.json'))).articles;
  const weak = parseCsv(await readFile(path.join(OUT, 'branch_fixes_weak.csv'), 'utf-8'));
  const strong = parseCsv(await readFile(path.join(OUT, 'branch_fixes.csv'), 'utf-8'));

  const byKey = new Map(rows.map(r => [`${r.qId}|${r.choice}`, r]));
  const items = [];
  const key = [];

  const push = (qId, choice, group, ours) => {
    const src = byKey.get(`${qId}|${choice}`);
    if (!src) return;
    const text = extractChoice(questionText[qId], choice);
    if (!text) return;
    items.push({ qId, choice, stem: stem(questionText[qId]), text });
    key.push({ qId, choice, group, ours });
  };

  for (const r of weak) push(r['問題'], r['肢'], 'target', r['修正後']);
  for (const r of strong) push(r['問題'], r['肢'], 'fixed', r['修正後']);

  // 対照群: 選択肢が条文本文をほぼ引き写しているもの（＝正解が動かない）。
  // 相手の精度を測るために混ぜる。
  const used = new Set(items.map(i => `${i.qId}|${i.choice}`));
  const cands = [];
  for (const r of rows) {
    if (!r.article || r.article === 'null' || !law[r.article]) continue;
    if (used.has(`${r.qId}|${r.choice}`)) continue;
    const text = extractChoice(questionText[r.qId], r.choice);
    if (!text) continue;
    const v = overlap(text, law[r.article].text);
    if (v >= 0.5) cands.push({ r, v });
  }
  cands.sort((a, b) => b.v - a.v);
  for (const c of cands.slice(0, 10)) {
    push(c.r.qId, c.r.choice, 'control', c.r.article);
  }

  // 並びをシャッフル（群が分からないように）。再現性のため固定シード
  let seed = 20260907;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const order = items.map((_, i) => i).sort(() => rnd() - 0.5);
  const shuffled = order.map(i => ({ ...items[i], no: 0 }));
  shuffled.forEach((x, i) => { x.no = i + 1; });
  const answerKey = order.map((i, j) => ({ no: j + 1, ...key[i] }));

  await writeFile(path.join(OUT, 'blind_answer_key.json'), JSON.stringify(answerKey, null, 2), 'utf-8');

  const md = [
    '# 民法 根拠条文の独立判定（' + shuffled.length + '件）',
    '',
    '## お願い',
    '',
    '行政書士試験（令和2〜7年度）の民法の問題です。**選択肢ごとに、その記述の根拠となる民法の条文を1つ**答えてください。',
    '',
    '### 条件',
    '',
    '- 条文は**枝番まで正確に**答えてください（例：`417の2`、`899の2`、`398の3`）。親条文で丸めないでください。',
    '- 判例のみが根拠で、対応する条文が特定できない場合は `null` としてください。無理に条文を当てはめないでください。',
    '- 複数条文が関わる場合は、**その選択肢の記述が直接の根拠とする1条**を選んでください。',
    '- 自信の度合いを `high` / `mid` / `low` で付けてください。',
    '- 各件について、なぜその条文なのかを**1行**で書いてください。',
    '',
    '### 注意',
    '',
    'この一覧には、条文が明らかなものと、判断が割れうるものが混ざっています。',
    '**他の人の判定結果は意図的に伏せています。**先入観なしで、条文の文言から判断してください。',
    '分からないものを埋めるより、`low` や `null` を正直に付けてもらう方が有用です。',
    '',
    '### 出力形式',
    '',
    '```json',
    '[',
    '  {"no": 1, "article": "177", "confidence": "high", "reason": "不動産物権変動の対抗要件そのもの"},',
    '  {"no": 2, "article": null, "confidence": "low", "reason": "判例法理で条文の直接の根拠がない"}',
    ']',
    '```',
    '',
    'JSON配列だけを返してください。前置き・解説は不要です。',
    '',
    '---',
    '',
  ];

  for (const it of shuffled) {
    md.push(`## ${it.no}. ${it.qId} 肢${it.choice}`);
    md.push('');
    md.push(`**設問**：${it.stem.slice(0, 200)}`);
    md.push('');
    const body = it.text.replace(/\s+/g, ' ').replace(/\s*\d{1,3}\s*$/, '').trim();
    md.push(`**選択肢**：${body.slice(0, 400)}`);
    md.push('');
  }

  await writeFile(path.join(DESKTOP, '民法_ブラインド判定_入力.md'), md.join('\n'), 'utf-8');

  const g = k => answerKey.filter(a => a.group === k).length;
  console.log(`出力 ${shuffled.length}件（target ${g('target')} / fixed ${g('fixed')} / control ${g('control')}）`);
  console.log('→ Desktop/民法_ブラインド判定_入力.md');
  console.log('→ tools/out/blind_answer_key.json（突き合わせ用。相手には渡さない）');
};

main().catch(e => { console.error(e); process.exit(1); });
