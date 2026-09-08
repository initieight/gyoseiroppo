#!/usr/bin/env node
/**
 * 選択肢単位のデータから public/highlights/r2_r7_civil_code.json を組み直す。
 *
 *   node tools/emit_civil_highlights.mjs          … 差分の確認のみ（書き込まない）
 *   node tools/emit_civil_highlights.mjs --write  … 実際に書き込む
 *
 * 【枝番の補正】
 * 元データには「第417条の2」を「第417条」に丸めてしまっている割当がある。
 * 選択肢本文と条文本文の3-gram重なりを親条文と枝番で比較し、
 * 枝番のほうが明確に高い場合だけ機械的に付け替える。
 * 判定が微妙なものは補正せず、要判定として CSV に出す。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const WRITE = process.argv.includes('--write');

/** 枝番へ付け替える条件 */
const BRANCH_MIN_SCORE = 0.30; // 枝番側の重なりがこれ以上
const BRANCH_MIN_DELTA = 0.15; // 親との差がこれ以上
const WEAK_PARENT_MAX = 0.15;  // 親条文がこれ未満なら、枝番が上回った時点で寄せる

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

/** 条文本文のうち、選択肢と最も重なる一文を出題箇所として返す */
function pickPhrases(articleText, choiceText, max = 3) {
  const sents = String(articleText)
    .split(/(?<=。)|\n/)
    .map(s => s.trim())
    .filter(s => s.length >= 15);
  return sents
    .map(s => ({ s, v: overlap(s, choiceText) }))
    .filter(x => x.v >= 0.12)
    .sort((a, b) => b.v - a.v)
    .slice(0, max)
    .map(x => x.s);
}

const main = async () => {
  const { rows, questionText } = await readJson(path.join(OUT, 'civil_choices.json'));
  const law = (await readJson(path.join(HERE, 'public/laws/civil_code.json'))).articles;
  const curPath = path.join(HERE, 'public/highlights/r2_r7_civil_code.json');
  const cur = await readJson(curPath);
  const ovr = (await readJson(path.join(HERE, 'tools/overrides.json'))).overrides ?? [];
  const ovrMap = new Map(ovr.map(o => [`${o.qId}|${o.choice}`, o]));
  const ovrApplied = [];

  const branchLog = [];
  const weakLog = [];
  const unresolved = [];
  const dropped = [];

  // ── 枝番補正 ──
  const fixed = rows.map(r => {
    if (!r.article || r.article === 'null') {
      dropped.push({ ...r, reason: '元データに条文の割当なし' });
      return null;
    }
    if (!law[r.article]) {
      unresolved.push({ ...r, reason: `第${r.article}条が民法に存在しない` });
      return null;
    }
    // 手動の上書きが最優先（独立判定で覆ったもの）
    const o = ovrMap.get(`${r.qId}|${r.choice}`);
    if (o) {
      ovrApplied.push(o);
      if (o.article === null) {
        dropped.push({ ...r, reason: `上書きにより割当なし: ${o.reason}` });
        return null;
      }
      if (!law[o.article]) {
        unresolved.push({ ...r, reason: `上書き先の第${o.article}条が民法に存在しない` });
        return null;
      }
      return { ...r, article: o.article, choiceText: extractChoice(questionText[r.qId], r.choice), overridden: true };
    }
    const ch = extractChoice(questionText[r.qId], r.choice);
    const base = overlap(ch, law[r.article].text);
    let best = null;
    for (const k of Object.keys(law)) {
      if (!k.startsWith(r.article + 'の')) continue;
      const v = overlap(ch, law[k].text);
      if (!best || v > best.v) best = { k, v };
    }
    if (best && best.v >= BRANCH_MIN_SCORE && best.v - base >= BRANCH_MIN_DELTA) {
      branchLog.push({
        qId: r.qId, choice: r.choice, from: r.article, to: best.k,
        fromScore: base.toFixed(2), toScore: best.v.toFixed(2),
        fromCaption: law[r.article].caption ?? '', toCaption: law[best.k].caption ?? '',
      });
      return { ...r, article: best.k, choiceText: ch, branchFixed: true };
    }
    // 第2段階: 親条文がそもそもほとんど一致していない（<0.15）なら、
    // 枝番のほうが少しでも高い時点で枝番に寄せる。
    // 元データが枝番を親に丸めているのが分かっているため、
    // 「親も一致しない」状態を親のまま残す理由がない。
    if (best && best.v > base && base < WEAK_PARENT_MAX) {
      weakLog.push({
        qId: r.qId, choice: r.choice, from: r.article, to: best.k,
        fromScore: base.toFixed(2), toScore: best.v.toFixed(2),
        fromCaption: law[r.article].caption ?? '', toCaption: law[best.k].caption ?? '',
      });
      return { ...r, article: best.k, choiceText: ch, branchFixed: true };
    }
    if (best && best.v > base) {
      unresolved.push({
        ...r, reason: `枝番（第${best.k}条 ${law[best.k].caption ?? ''}）のほうがやや一致するが、` +
          `親条文もある程度一致しているため補正していない（親${base.toFixed(2)} / 枝番${best.v.toFixed(2)}）`,
      });
    }
    return { ...r, choiceText: ch, branchFixed: false };
  }).filter(Boolean);

  // ── 集計 ──
  const articles = {};
  for (const r of fixed) {
    const a = (articles[r.article] ??= { count: 0, years: [], phrases: [], questions: [], _qs: new Set() });
    const qLabel = `${r.year}-${r.qNum}`;
    if (!a._qs.has(qLabel)) {
      a._qs.add(qLabel);
      a.questions.push(qLabel);
      a.count += 1;
      if (!a.years.includes(r.year)) a.years.push(r.year);
    }
    for (const p of pickPhrases(law[r.article].text, r.choiceText)) {
      if (!a.phrases.includes(p)) a.phrases.push(p);
    }
  }
  const YEAR_ORDER = ['R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
  const artNum = k => {
    const m = k.match(/^(\d+)(?:の(\d+))?/);
    return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 1000 : 0) : 1e9;
  };
  const outArticles = {};
  for (const k of Object.keys(articles).sort((a, b) => artNum(a) - artNum(b))) {
    const a = articles[k];
    delete a._qs;
    a.years.sort((x, y) => YEAR_ORDER.indexOf(x) - YEAR_ORDER.indexOf(y));
    a.questions.sort();
    a.phrases = a.phrases.slice(0, 6);
    outArticles[k] = a;
  }

  // ── 差分 ──
  const before = cur.articles;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(outArticles)])]
    .sort((a, b) => artNum(a) - artNum(b));
  const diff = keys.map(k => ({
    article: k,
    caption: law[k]?.caption ?? '',
    beforeCount: before[k]?.count ?? 0,
    afterCount: outArticles[k]?.count ?? 0,
    beforeYears: (before[k]?.years ?? []).join('/'),
    afterYears: (outArticles[k]?.years ?? []).join('/'),
    change: !before[k] ? '新規' : !outArticles[k] ? '削除' : (before[k].count !== outArticles[k].count ? '変更' : '同じ'),
  }));

  const csv = (head, arr, cols) =>
    '﻿' + [head.join(',')].concat(
      arr.map(o => cols.map(c => `"${String(o[c] ?? '').replace(/"/g, '""')}"`).join(',')),
    ).join('\n');

  await writeFile(path.join(OUT, 'diff.csv'),
    csv(['条文', '見出し', '変更', '旧カウント', '新カウント', '旧年度', '新年度'],
      diff, ['article', 'caption', 'change', 'beforeCount', 'afterCount', 'beforeYears', 'afterYears']), 'utf-8');
  await writeFile(path.join(OUT, 'branch_fixes.csv'),
    csv(['問題', '肢', '修正前', '修正前見出し', '修正後', '修正後見出し', '修正前一致度', '修正後一致度'],
      branchLog, ['qId', 'choice', 'from', 'fromCaption', 'to', 'toCaption', 'fromScore', 'toScore']), 'utf-8');
  await writeFile(path.join(OUT, 'branch_fixes_weak.csv'),
    csv(['問題', '肢', '修正前', '修正前見出し', '修正後', '修正後見出し', '修正前一致度', '修正後一致度'],
      weakLog, ['qId', 'choice', 'from', 'fromCaption', 'to', 'toCaption', 'fromScore', 'toScore']), 'utf-8');
  await writeFile(path.join(OUT, 'unresolved.csv'),
    csv(['問題', '肢', '条文', '理由'], unresolved, ['qId', 'choice', 'article', 'reason']), 'utf-8');

  const stat = a => {
    const v = Object.values(a);
    const asked = v.filter(x => x.count > 0).length;
    const total = v.reduce((s, x) => s + x.count, 0);
    const fan = new Map();
    for (const x of v) for (const q of x.questions ?? []) fan.set(q, (fan.get(q) ?? 0) + 1);
    const avg = fan.size ? [...fan.values()].reduce((s, n) => s + n, 0) / fan.size : 0;
    return { asked, total, questions: fan.size, avg: avg.toFixed(1), max: fan.size ? Math.max(...fan.values()) : 0 };
  };
  const b = stat(before);
  const a2 = stat(outArticles);
  console.log('              旧      →   新');
  console.log(`出題条文数    ${String(b.asked).padStart(4)}   →  ${String(a2.asked).padStart(4)}`);
  console.log(`総カウント    ${String(b.total).padStart(4)}   →  ${String(a2.total).padStart(4)}`);
  console.log(`問題数        ${String(b.questions).padStart(4)}   →  ${String(a2.questions).padStart(4)}`);
  console.log(`1問あたり条文 ${String(b.avg).padStart(4)}   →  ${String(a2.avg).padStart(4)}  （最大 ${b.max} → ${a2.max}）`);
  console.log(`\n枝番の自動補正 ${branchLog.length}件 / 要判定 ${unresolved.length}件 / 割当なし ${dropped.length}件`);
  console.log(`差分: 新規 ${diff.filter(d => d.change === '新規').length} / 削除 ${diff.filter(d => d.change === '削除').length} / 変更 ${diff.filter(d => d.change === '変更').length}`);

  if (WRITE) {
    await writeFile(curPath,
      JSON.stringify({ lawId: 'civil_code', range: ['R2', 'R7'], articles: outArticles }, null, 2) + '\n',
      'utf-8');
    console.log('\n✅ public/highlights/r2_r7_civil_code.json を更新しました');
  } else {
    await writeFile(path.join(OUT, 'r2_r7_civil_code.new.json'),
      JSON.stringify({ lawId: 'civil_code', range: ['R2', 'R7'], articles: outArticles }, null, 2) + '\n',
      'utf-8');
    console.log('\n（未書き込み。--write で反映。新データは tools/out/r2_r7_civil_code.new.json）');
  }
};

main().catch(e => { console.error(e); process.exit(1); });
