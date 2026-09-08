#!/usr/bin/env node
/**
 * ビルド成果物の中身を検査する。
 *
 *   npm run build   … next build のあとに自動で走る
 *
 * 「ビルドは通ったが中身が空」という壊れ方を出荷しないための番人。
 * 実際に、サイトマップが ISR で実行時再生成されて 3,343 → 17 に縮んだまま
 * 3週間気づかなかったことがある。
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, '.next/server/app');

const errors = [];
const ok = [];
const fail = (m) => errors.push(m);
const pass = (m) => ok.push(m);

const read = async p => readFile(p, 'utf-8');
const exists = async p => stat(p).then(() => true, () => false);

async function main() {
  // ── sitemap.xml ──
  const smPath = path.join(APP, 'sitemap.xml.body');
  if (!(await exists(smPath))) {
    fail('sitemap.xml がビルド出力に無い（実行時生成になっている可能性）');
  } else {
    const sm = await read(smPath);
    const n = (sm.match(/<loc>/g) ?? []).length;
    const ranking = (sm.match(/\/ranking\//g) ?? []).length;
    const articles = (sm.match(/<loc>[^<]*\/law\/[a-z_]+\/[^<]+<\/loc>/g) ?? []).length;
    if (n < 3000) fail(`sitemap の URL が ${n} 件しかない（条文ページだけで3,000件以上あるはず）`);
    else pass(`sitemap ${n} URL`);
    if (ranking < 11) fail(`sitemap の /ranking/ が ${ranking} 件（11件あるはず）`);
    else pass(`sitemap の /ranking/ ${ranking} 件`);
    if (articles < 3000) fail(`sitemap の条文ページが ${articles} 件しかない`);
    else pass(`sitemap の条文ページ ${articles} 件`);
  }

  // ── robots.txt ──
  const rbPath = path.join(APP, 'robots.txt.body');
  if (!(await exists(rbPath))) fail('robots.txt がビルド出力に無い');
  else {
    const rb = await read(rbPath);
    if (!rb.includes('Sitemap:')) fail('robots.txt に Sitemap 行が無い');
    // 記事ページのパスは /law/（単数）。/laws/ は生JSONなので遮断してよい
    if (/Disallow:\s*\/law\/?\s*$/m.test(rb)) fail('robots.txt が記事ページ /law/ を遮断している');
    else pass('robots.txt OK');
  }

  // ── 主要ページが中身を持っているか ──
  const samples = [
    ['index.html', ['行政六法']],
    ['law/civil_code.html', ['民法', '第百七十七条']],
    ['law/civil_code/177.html', ['第三者に対抗することができない']],
    ['ranking/civil_code.html', ['出題ランキング', '第百七十七条']],
    ['about.html', ['免責事項']],
    ['kouza/gyosei.html', ['広告']],
  ];
  for (const [rel, needles] of samples) {
    const p = path.join(APP, rel);
    if (!(await exists(p))) { fail(`${rel} がビルド出力に無い`); continue; }
    const html = await read(p);
    if (html.includes('読み込み中')) fail(`${rel} に「読み込み中」が残っている（SSRされていない）`);
    const missing = needles.filter(x => !html.includes(x));
    if (missing.length) fail(`${rel} に期待した文字列が無い: ${missing.join(', ')}`);
    else pass(`${rel} OK`);
  }

  // ── 条文ページの生成数 ──
  const lawDir = path.join(APP, 'law');
  let count = 0;
  const walk = async d => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.isDirectory()) await walk(path.join(d, e.name));
      else if (e.name.endsWith('.html')) count++;
    }
  };
  if (await exists(lawDir)) await walk(lawDir);
  if (count < 3300) fail(`条文ページの生成数が ${count}（3,300以上あるはず）`);
  else pass(`条文ページ ${count} 件を生成`);

  // ── 結果 ──
  for (const m of ok) console.log(`  ✓ ${m}`);
  if (errors.length) {
    console.log('');
    for (const m of errors) console.log(`  ✗ ${m}`);
    console.log(`\n❌ ビルド成果物の検査に失敗しました（${errors.length}件）`);
    process.exit(1);
  }
  console.log('\n✅ ビルド成果物の検査OK');
}

main().catch(e => { console.error(e); process.exit(1); });
