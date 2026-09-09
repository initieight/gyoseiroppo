#!/usr/bin/env node
/**
 * 条文割当の回答から、その法令の出題データ（選択肢単位）を組み立てる。
 *
 *   node tools/emit_law_highlights.mjs 地方自治法          … 差分の確認だけ
 *   node tools/emit_law_highlights.mjs 地方自治法 --write  … 書き込む
 *
 * 民法と同じ形式（count / years / questions / phrases / choices）に揃えるので、
 * 表示側は countBasis を 'choice' にするだけで対応できる。
 *
 * ■ 全肢が null の問題は取り込まない
 *   設問文から法令を判定する仕組み（split_gyosei_choices.mjs）が、
 *   行政法総論や判例中心の問題を拾いすぎることがある。
 *   全肢に条文が付かなかった問題は、その法令の問題ではないと判断して落とす。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const DESKTOP = process.env.USERPROFILE + '/Desktop';
const WRITE = process.argv.includes('--write');
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const NAME_TO_ID = {
  憲法: 'constitution', 商法: 'commercial_code', 会社法: 'company_act',
  行政手続法: 'admin_procedure', 行政不服審査法: 'admin_appeal',
  行政事件訴訟法: 'admin_litigation', 国家賠償法: 'state_liability',
  行政代執行法: 'admin_enforcement', 地方自治法: 'local_autonomy',
  国家行政組織法: 'national_admin_org',
};

const YEAR_ORDER = ['R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
const norm = s => (s ?? '').replace(/\s/g, '');

const normArt = a => {
  if (a === null || a === undefined || a === '' || a === 'null') return null;
  return String(a)
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s/g, '').replace(/^第/, '').replace(/条$/, '').replace(/条の/, 'の');
};

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

/** 条文本文のうち、選択肢と最も重なる一文を出題箇所として返す */
function pickPhrases(articleText, choiceText, max = 3) {
  return String(articleText)
    .split(/(?<=。)|\n/)
    .map(s => s.trim())
    .filter(s => s.length >= 15)
    .map(s => ({ s, v: overlap(s, choiceText) }))
    .filter(x => x.v >= 0.12)
    .sort((a, b) => b.v - a.v)
    .slice(0, max)
    .map(x => x.s);
}

const artNum = k => {
  const m = k.match(/^(\d+)(?:の(\d+))?(?:の(\d+))?/);
  if (!m) return 1e9;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 1000 : 0) + (m[3] ? Number(m[3]) / 1e6 : 0);
};

const main = async () => {
  const name = process.argv[2];
  const lawId = NAME_TO_ID[name];
  if (!lawId) {
    console.error(`法令名を指定してください: ${Object.keys(NAME_TO_ID).join(' / ')}`);
    process.exit(1);
  }

  const { rows } = await readJson(path.join(OUT, `gyosei_choices_${lawId}.json`));
  const law = (await readJson(path.join(HERE, `public/laws/${lawId}.json`))).articles;
  const ans = await readJson(path.join(DESKTOP, `条文割当_${name}_回答.json`));
  const curPath = path.join(HERE, `public/highlights/r2_r7_${lawId}.json`);
  const cur = await readJson(curPath);

  const byKey = new Map(ans.map(a => [`${a.qId}|${a.choice}`, a]));
  const rowsByQ = new Map();
  for (const r of rows) {
    if (!rowsByQ.has(r.qId)) rowsByQ.set(r.qId, []);
    rowsByQ.get(r.qId).push(r);
  }

  // 全肢に条文が付かなかった問題は、その法令の問題ではないと判断して落とす
  const dropped = [];
  const keptQ = [];
  for (const [qId, rs] of rowsByQ) {
    const arts = rs.map(r => normArt(byKey.get(`${r.qId}|${r.choice}`)?.article));
    if (arts.every(a => a === null)) dropped.push(qId);
    else keptQ.push(qId);
  }

  const articles = {};
  const unknown = [];
  const missing = [];
  for (const qId of keptQ) {
    for (const r of rowsByQ.get(qId)) {
      const a = byKey.get(`${r.qId}|${r.choice}`);
      if (!a) { missing.push(`${r.qId} 肢${r.choice}`); continue; }
      const art = normArt(a.article);
      if (art === null) continue;
      if (!law[art]) { unknown.push(`${r.qId} 肢${r.choice} → 第${art}条`); continue; }

      const e = (articles[art] ??= {
        count: 0, choices: 0, years: [], phrases: [], questions: [], _qs: new Set(),
      });
      e.choices += 1;
      if (!e._qs.has(qId)) {
        e._qs.add(qId);
        e.questions.push(qId);
        e.count += 1;
        if (!e.years.includes(r.year)) e.years.push(r.year);
      }
      for (const p of pickPhrases(law[art].text, r.text)) {
        if (!e.phrases.includes(p)) e.phrases.push(p);
      }
    }
  }

  const out = {};
  for (const k of Object.keys(articles).sort((a, b) => artNum(a) - artNum(b))) {
    const e = articles[k];
    delete e._qs;
    e.years.sort((x, y) => YEAR_ORDER.indexOf(x) - YEAR_ORDER.indexOf(y));
    e.questions.sort();
    e.phrases = e.phrases.slice(0, 6);
    out[k] = e;
  }

  // ── 差分 ──
  const before = cur.articles ?? {};
  const beforeAsked = Object.entries(before).filter(([, v]) => v.count > 0).map(([k]) => k);
  const afterAsked = Object.keys(out);
  const added = afterAsked.filter(k => !beforeAsked.includes(k));
  const removed = beforeAsked.filter(k => !afterAsked.includes(k));

  const fan = new Map();
  for (const v of Object.values(out)) for (const q of v.questions) fan.set(q, (fan.get(q) ?? 0) + 1);
  const avg = fan.size ? [...fan.values()].reduce((a, b) => a + b, 0) / fan.size : 0;

  console.log(`${name}`);
  console.log(`  取り込んだ問題        ${keptQ.length}問（全肢nullで除外 ${dropped.length}問）`);
  if (dropped.length) console.log(`    除外: ${dropped.sort().join(', ')}`);
  console.log(`  出題条文              ${beforeAsked.length}条 → ${afterAsked.length}条（新規${added.length} / 消える${removed.length}）`);
  console.log(`  1問あたりの条文数      ${avg.toFixed(1)}（最大 ${fan.size ? Math.max(...fan.values()) : 0}）`);
  console.log(`  ハイライトのない条文    ${Object.values(out).filter(v => !v.phrases.length).length}条`);
  if (unknown.length) console.log(`  ⚠ 存在しない条文 ${unknown.length}件: ${unknown.slice(0, 5).join(', ')}`);
  if (missing.length) console.log(`  ⚠ 回答に無い肢 ${missing.length}件: ${missing.slice(0, 5).join(', ')}`);

  const body = JSON.stringify({ lawId, range: ['R2', 'R7'], articles: out }, null, 2) + '\n';
  if (WRITE) {
    await writeFile(curPath, body, 'utf-8');
    console.log(`\n✅ public/highlights/r2_r7_${lawId}.json を更新しました`);
  } else {
    await writeFile(path.join(OUT, `r2_r7_${lawId}.new.json`), body, 'utf-8');
    console.log(`\n（未書き込み。--write で反映）`);
  }
};

main().catch(e => { console.error(e); process.exit(1); });
