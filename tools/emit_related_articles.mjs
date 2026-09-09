#!/usr/bin/env node
/**
 * 「同じ問題で一緒に問われた条文」を出題データから機械的に作る。
 *
 *   node tools/emit_related_articles.mjs          … 確認のみ
 *   node tools/emit_related_articles.mjs --write  … 書き出す
 *
 * 法的な判断は一切していない。1つの問題に複数の条文が根拠として割り当てられて
 * いるとき、それらを共起として数えているだけ。
 * 「関連条文」ではなく「一緒に問われた条文」と呼ぶこと。論点の近さを保証しない。
 *
 * 入力: public/highlights/r2_r7_civil_code.json（行政書士）
 *       public/highlights/other_exams_civil_code.json（他資格）
 * 出力: public/highlights/related_civil_code.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const MAX_PER_ARTICLE = 8;
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const main = async () => {
  const gyosei = (await readJson(path.join(HERE, 'public/highlights/r2_r7_civil_code.json'))).articles;
  const other = (await readJson(path.join(HERE, 'public/highlights/other_exams_civil_code.json'))).articles;
  const law = (await readJson(path.join(HERE, 'public/laws/civil_code.json'))).articles;

  // 問題 → その問題で根拠になった条文の集合
  const q2a = new Map();
  const add = (q, a) => {
    if (!q2a.has(q)) q2a.set(q, new Set());
    q2a.get(q).add(a);
  };
  for (const [k, v] of Object.entries(gyosei)) {
    for (const q of v.questions ?? []) add(`gyosei-${q}`, k);
  }
  for (const [k, v] of Object.entries(other)) {
    for (const [exam, ev] of Object.entries(v.byExam ?? {})) {
      for (const q of ev.questions ?? []) add(`${exam}-${q}`, k);
    }
  }

  // 共起カウント
  const co = new Map();
  for (const arts of q2a.values()) {
    // 1問に多数の条文がぶら下がる場合、共起の情報量が落ちるので上限を設ける
    if (arts.size > 12) continue;
    const list = [...arts];
    for (const a of list) {
      if (!co.has(a)) co.set(a, new Map());
      const m = co.get(a);
      for (const b of list) if (a !== b) m.set(b, (m.get(b) ?? 0) + 1);
    }
  }

  const artNum = k => {
    const m = k.match(/^(\d+)(?:の(\d+))?/);
    return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 1000 : 0) : 1e9;
  };

  const out = {};
  for (const k of [...co.keys()].sort((a, b) => artNum(a) - artNum(b))) {
    const rows = [...co.get(k).entries()]
      .filter(([b]) => law[b])
      .sort((x, y) => y[1] - x[1] || artNum(x[0]) - artNum(y[0]))
      .slice(0, MAX_PER_ARTICLE)
      .map(([article, count]) => ({ article, count }));
    if (rows.length) out[k] = rows;
  }

  const sizes = Object.values(out).map(v => v.length);
  console.log(`共起を持つ条文 ${Object.keys(out).length} 件`);
  console.log(`  1条あたり ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1)} 件（上限${MAX_PER_ARTICLE}）`);
  console.log(`  除外した問題（1問に13条以上）: ${[...q2a.values()].filter(s => s.size > 12).length} / ${q2a.size}問`);
  console.log('\n例: 第177条');
  for (const r of out['177'] ?? []) {
    console.log(`  第${r.article}条${law[r.article]?.caption ?? ''} — 同時出題${r.count}回`);
  }

  const dest = path.join(HERE, 'public/highlights/related_civil_code.json');
  if (WRITE) {
    await writeFile(dest, JSON.stringify({ lawId: 'civil_code', articles: out }, null, 2) + '\n', 'utf-8');
    console.log(`\n✅ ${path.relative(HERE, dest)} を更新しました`);
  } else {
    console.log('\n（未書き込み。--write で反映）');
  }
};

main().catch(e => { console.error(e); process.exit(1); });
