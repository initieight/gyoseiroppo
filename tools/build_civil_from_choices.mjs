#!/usr/bin/env node
/**
 * 民法の出題データを「選択肢単位」で組み直す。
 *
 *   node tools/build_civil_from_choices.mjs
 *
 * 入力（minpo プロジェクト側。読むだけで書き換えない）
 *   scripts/gyosei_choice_articles.json  … {q_id, choice_num, article, correct}
 *   scripts/gyosei_remaining_choice_nums.json
 *   scripts/choice_num_batch_*.json      … {article, article_caption, q_id, note, question_text}
 *
 * 出力（このリポジトリの scratch）
 *   tools/out/civil_choices.json  … 統合済みの選択肢データ
 *   tools/out/verify.csv          … 機械検証の結果（人が見る用）
 *
 * 既存の public/highlights/r2_r7_civil_code.json はこの時点では書き換えない。
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const MINPO = process.env.USERPROFILE + '/project/minpo';
const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.join(HERE, 'tools', 'out');

const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const main = async () => {
  await mkdir(OUT, { recursive: true });

  // ── 1. 選択肢→条文 の割当 ──
  const choices = await readJson(path.join(MINPO, 'scripts/gyosei_choice_articles.json'));
  let remaining = [];
  try {
    remaining = await readJson(path.join(MINPO, 'scripts/gyosei_remaining_choice_nums.json'));
  } catch { /* 無ければ無視 */ }

  // ── 2. 論点メモと問題文（batch ファイル群） ──
  const files = (await readdir(path.join(MINPO, 'scripts')))
    .filter(f => /^choice_num_batch_\d+\.json$/.test(f));
  const meta = new Map();      // `${q_id}|${article}` → {caption, note, questionText}
  const qText = new Map();     // q_id → question_text
  for (const f of files) {
    for (const r of await readJson(path.join(MINPO, 'scripts', f))) {
      if (!String(r.q_id ?? '').startsWith('gyosei-')) continue;
      meta.set(`${r.q_id}|${r.article}`, {
        caption: r.article_caption ?? '',
        note: r.note ?? '',
      });
      if (r.question_text) qText.set(r.q_id, r.question_text);
    }
  }

  // ── 3. 統合 ──
  const seen = new Set();
  const rows = [];
  for (const c of [...choices, ...remaining]) {
    const qid = String(c.q_id);
    if (!qid.startsWith('gyosei-')) continue;
    const key = `${qid}|${c.choice_num}|${c.article}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const m = meta.get(`${qid}|${c.article}`) ?? {};
    rows.push({
      qId: qid,
      year: qid.split('-')[1],
      qNum: qid.split('-')[2],
      choice: String(c.choice_num ?? ''),
      article: String(c.article),
      correct: c.correct ?? null,
      caption: m.caption ?? '',
      note: m.note ?? '',
    });
  }

  rows.sort((a, b) =>
    a.year.localeCompare(b.year) ||
    a.qNum.localeCompare(b.qNum, undefined, { numeric: true }) ||
    a.choice.localeCompare(b.choice, undefined, { numeric: true }));

  await writeFile(path.join(OUT, 'civil_choices.json'),
    JSON.stringify({ rows, questionText: Object.fromEntries(qText) }, null, 2), 'utf-8');

  const qs = new Set(rows.map(r => r.qId));
  const arts = new Set(rows.map(r => r.article));
  console.log(`選択肢レコード ${rows.length} / 問題 ${qs.size} / 条文 ${arts.size}`);
  console.log(`論点メモ付き: ${rows.filter(r => r.note).length} / 問題文あり: ${qText.size}問`);
  const byYear = {};
  for (const r of rows) (byYear[r.year] ??= new Set()).add(r.qId);
  console.log('年度別問題数:', Object.fromEntries(Object.entries(byYear).map(([k, v]) => [k, v.size])));
};

main().catch(e => { console.error(e); process.exit(1); });
