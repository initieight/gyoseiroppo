#!/usr/bin/env node
/**
 * 他資格（司法書士・予備試験）の条文割当から、その法令の他資格データを組み立てる。
 *
 *   node tools/emit_other_exams_review.mjs          … 差分の確認だけ
 *   node tools/emit_other_exams_review.mjs --write  … 書き込む
 *   node tools/emit_other_exams_review.mjs --years=R5,R6,R7 --answers-dir=tools/out/company_review
 *
 * 出力は民法の other_exams_civil_code.json と同じ形式にする。
 * 表示側（components/OtherExams.tsx）はそのまま使える。
 *
 *   public/highlights/other_exams_company_act.json
 *   public/highlights/other_exams_commercial_code.json
 *   public/highlights/other_exams_constitution.json
 *
 * ■ 行政書士の数字とは合算しない
 *   試験ごとに問われ方の重みが違うため、別の数字として持つ（lib/laws.ts の方針）。
 *
 * ■ 未検証であることを忘れないこと
 *   行政書士分は独立判定を通しているが、他資格分は通していない。
 *   表示側で「未検証」と明示する。
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const WRITE = process.argv.includes('--write');
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const option = name => {
  const prefix = `--${name}=`;
  const arg = process.argv.find(v => v.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
};
const includedYears = (option('years') ?? 'R2,R3,R4,R5,R6,R7')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);
const includedYearSet = new Set(includedYears);
const answersDir = option('answers-dir')
  ? path.resolve(HERE, option('answers-dir'))
  : process.env.USERPROFILE + '/Desktop';

const LAW_NAME_TO_ID = { 会社法: 'company_act', 商法: 'commercial_code', 憲法: 'constitution' };
const EXAM_ORDER = ['shiho', 'yobi', 'shoshi', 'takken'];
const YEAR_ORDER = ['R2', 'R3', 'R4', 'R5', 'R6', 'R7'];

const normArt = a => {
  if (a === null || a === undefined || a === '' || a === 'null') return null;
  return String(a)
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s/g, '').replace(/^第/, '').replace(/条$/, '').replace(/条の/, 'の');
};

const artNum = k => {
  const m = k.match(/^(\d+)(?:の(\d+))?(?:の(\d+))?/);
  if (!m) return 1e9;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 1000 : 0) + (m[3] ? Number(m[3]) / 1e6 : 0);
};

const main = async () => {
  // tools/out の other_choices_*.json をまとめて読む（商法・会社法／憲法）
  const groupFiles = (await readdir(OUT)).filter(f => f.startsWith('other_choices_'));
  const rows = [];
  for (const f of groupFiles) rows.push(...(await readJson(path.join(OUT, f))).rows);
  const rowByKey = new Map(rows.map(r => [`${r.qId}|${r.choice}`, r]));

  const files = (await readdir(answersDir)).filter(f => /^条文割当_他資格_.+_回答\.json$/.test(f));
  if (!files.length) {
    console.error(`回答ファイルが見つかりません: ${answersDir}\\条文割当_他資格_*_回答.json`);
    process.exit(1);
  }
  const ans = [];
  for (const f of files) {
    const a = await readJson(path.join(answersDir, f));
    ans.push(...a);
    console.log(`読み込み: ${f}（${a.length}肢）`);
  }

  // lawId → 条文キー → { total, byExam }
  const byLaw = {};
  const unknown = [];
  const orphan = [];
  for (const a of ans) {
    const row = rowByKey.get(`${a.qId}|${a.choice}`);
    if (!row) { orphan.push(`${a.qId} 肢${a.choice}`); continue; }
    if (!includedYearSet.has(row.year)) continue;
    const lawName = a.law === null || a.law === undefined || a.law === 'null' ? null : String(a.law).trim();
    const art = normArt(a.article);
    if (!lawName || !art) continue;
    const lawId = LAW_NAME_TO_ID[lawName];
    if (!lawId) { unknown.push(`${a.qId} 肢${a.choice} → law "${lawName}"`); continue; }

    const store = (byLaw[lawId] ??= { articles: {}, arts: null });
    if (!store.arts) store.arts = (await readJson(path.join(HERE, `public/laws/${lawId}.json`))).articles;
    if (!store.arts[art]) { unknown.push(`${a.qId} 肢${a.choice} → ${lawName}第${art}条`); continue; }

    const e = (store.articles[art] ??= { total: 0, byExam: {} });
    const ex = (e.byExam[row.exam] ??= { count: 0, years: [], questions: [] });
    const label = `${row.year}-${row.qNum}`;
    if (!ex.questions.includes(label)) {
      ex.questions.push(label);
      ex.count += 1;
      e.total += 1;
      if (!ex.years.includes(row.year)) ex.years.push(row.year);
    }
  }

  for (const [lawId, store] of Object.entries(byLaw)) {
    const out = {};
    for (const k of Object.keys(store.articles).sort((a, b) => artNum(a) - artNum(b))) {
      const e = store.articles[k];
      for (const ex of Object.values(e.byExam)) {
        ex.years.sort((x, y) => YEAR_ORDER.indexOf(x) - YEAR_ORDER.indexOf(y));
        ex.questions.sort();
      }
      out[k] = e;
    }

    const exams = EXAM_ORDER.filter(e => Object.values(out).some(v => v.byExam[e]));
    const gyoseiPath = path.join(HERE, `public/highlights/r2_r7_${lawId}.json`);
    const gyosei = (await readJson(gyoseiPath)).articles ?? {};
    const both = Object.keys(out).filter(k => gyosei[k]).length;
    const all = new Set([...Object.keys(out), ...Object.keys(gyosei)]).size;

    const name = Object.entries(LAW_NAME_TO_ID).find(([, v]) => v === lawId)[0];
    console.log(`\n${name}`);
    console.log(`  他資格の出題実績        ${Object.keys(out).length}条`);
    for (const e of exams) {
      const arts = Object.values(out).filter(v => v.byExam[e]);
      const qs = new Set(arts.flatMap(v => v.byExam[e].questions));
      console.log(`    ${e.padEnd(7)} ${String(arts.length).padStart(3)}条 / ${qs.size}問`);
    }
    console.log(`  行政書士と重なる        ${both}条 / 他資格のみ ${Object.keys(out).length - both}条`);
    console.log(`  行政書士 ${Object.keys(gyosei).length}条 → 合計カバー ${all}条`);

    const dest = path.join(HERE, `public/highlights/other_exams_${lawId}.json`);
    const body = JSON.stringify({ lawId, exams, range: includedYears, articles: out }, null, 2) + '\n';
    if (WRITE) {
      await writeFile(dest, body, 'utf-8');
      console.log(`  ✅ ${path.relative(HERE, dest).replace(/\\/g, '/')} を更新`);
    }
  }

  if (unknown.length) console.log(`\n⚠ 取り込めなかった割当 ${unknown.length}件: ${unknown.slice(0, 6).join(', ')}`);
  if (orphan.length) console.log(`⚠ 肢データに無い回答 ${orphan.length}件: ${orphan.slice(0, 6).join(', ')}`);
  if (!WRITE) console.log('\n（未書き込み。--write で反映）');
};

main().catch(e => { console.error(e); process.exit(1); });
