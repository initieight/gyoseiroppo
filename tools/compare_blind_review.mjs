#!/usr/bin/env node
/**
 * 別モデルのブラインド判定結果と、こちらの割当を突き合わせる。
 *
 *   1. 相手の JSON 配列を Desktop/民法_ブラインド判定_回答.json として保存
 *   2. node tools/compare_blind_review.mjs
 *
 * 出力
 *   Desktop/民法_ブラインド判定_突合.csv
 *   標準出力に一致率のサマリ
 *
 * 見方
 *   control の一致率 = 相手の精度の目安。ここが低ければ相手の不一致は根拠が弱い。
 *   target の不一致  = 本当に確認すべき件。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const DESKTOP = process.env.USERPROFILE + '/Desktop';
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const normArt = a => {
  if (a === null || a === undefined || a === '' || a === 'null') return null;
  return String(a)
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/^第/, '')
    .replace(/条$/, '')
    .replace(/条の/, 'の')
    .replace(/-/g, 'の')
    .trim();
};

const main = async () => {
  const key = await readJson(path.join(OUT, 'blind_answer_key.json'));
  const ansPath = path.join(DESKTOP, '民法_ブラインド判定_回答.json');
  let ans;
  try {
    ans = await readJson(ansPath);
  } catch {
    console.error(`回答ファイルが見つかりません: ${ansPath}`);
    console.error('相手の JSON 配列をこのパスに保存してから再実行してください。');
    process.exit(1);
  }
  const law = (await readJson(path.join(HERE, 'public/laws/civil_code.json'))).articles;
  const byNo = new Map(ans.map(a => [Number(a.no), a]));

  const stat = {};
  const rows = [];
  for (const k of key) {
    const a = byNo.get(k.no) ?? {};
    const theirs = normArt(a.article);
    const ours = normArt(k.ours);
    // 親子関係（枝番の丸め）は「惜しい」として別扱いにする
    const parentOf = s => (s ? s.split('の')[0] : null);
    let verdict;
    if (theirs === null) verdict = '相手は条文なしと判断';
    else if (theirs === ours) verdict = '一致';
    else if (parentOf(theirs) === parentOf(ours)) verdict = '同じ条の枝番違い';
    else verdict = '不一致';

    (stat[k.group] ??= {}).total = ((stat[k.group] ??= {}).total ?? 0) + 1;
    stat[k.group][verdict] = (stat[k.group][verdict] ?? 0) + 1;

    rows.push({
      no: k.no, group: k.group, qId: k.qId, choice: k.choice,
      ours: ours ?? '', oursCaption: ours && law[ours] ? law[ours].caption ?? '' : '',
      theirs: theirs ?? 'null', theirsCaption: theirs && law[theirs] ? law[theirs].caption ?? '' : '',
      theirsExists: theirs ? (law[theirs] ? '' : '★民法に存在しない条番号') : '',
      confidence: a.confidence ?? '', verdict, reason: a.reason ?? '',
    });
  }

  rows.sort((a, b) => {
    const rank = v => (v === '不一致' ? 0 : v === '同じ条の枝番違い' ? 1 : v === '相手は条文なしと判断' ? 2 : 3);
    const grp = g => (g === 'control' ? 0 : g === 'target' ? 1 : 2);
    return rank(a.verdict) - rank(b.verdict) || grp(a.group) - grp(b.group) || a.no - b.no;
  });

  const head = ['判定', '群', 'No', '問題', '肢', 'こちら', 'こちら見出し', '相手', '相手見出し', '相手の自信', '相手の理由', '備考'];
  const csv = '\ufeff' + [head.join(',')].concat(
    rows.map(r => [r.verdict, r.group, r.no, r.qId, r.choice, r.ours, r.oursCaption,
      r.theirs, r.theirsCaption, r.confidence, r.reason, r.theirsExists]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
  ).join('\n');
  await writeFile(path.join(DESKTOP, '民法_ブラインド判定_突合.csv'), csv, 'utf-8');

  const LABEL = { control: '対照群（正解が確定）', target: '要確認（根拠が弱い補正）', fixed: '確実な補正' };
  console.log('群ごとの一致状況\n');
  for (const g of ['control', 'target', 'fixed']) {
    const s = stat[g];
    if (!s) continue;
    const hit = s['一致'] ?? 0;
    console.log(`${LABEL[g]}  ${hit}/${s.total} 一致 (${Math.round((hit / s.total) * 100)}%)`);
    for (const [k, v] of Object.entries(s)) {
      if (k === 'total' || k === '一致') continue;
      console.log(`    ${k}: ${v}`);
    }
  }
  const focus = rows.filter(r => r.group === 'target' && r.verdict === '不一致');
  console.log(`\n実際に運営者が見るべき件数: ${focus.length}`);
  console.log('→ Desktop/民法_ブラインド判定_突合.csv（不一致が上に並びます）');
};

main().catch(e => { console.error(e); process.exit(1); });
