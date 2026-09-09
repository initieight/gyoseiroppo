#!/usr/bin/env node
/**
 * 別モデルが白紙から割り当てた根拠条文を、機械的に検証する。
 *
 *   1. 返ってきた JSON 配列を Desktop/条文割当_{法令名}_回答.json として保存
 *   2. node tools/verify_law_review.mjs 行政手続法
 *
 * 民法のときは「こちらの案をブラインドで検証してもらう」形だったので
 * 突き合わせる相手がいたが、今回は相手が唯一の情報源になる。
 * その分、機械で検証できるところを厚くする。
 *
 * 検査
 *  A. 条文が実在するか（法令の条数の範囲内か）
 *  B. 選択肢に「第◯条」が明示されていて、それと一致するか  ← 正解が確定する
 *  C. 選択肢本文と条文本文の3-gram重なり
 *  D. 同じ問題で同じ条文に偏っていないか（1問で全肢が同じ条文＝雑な割当の疑い）
 *  E. null の比率
 *
 * B で正解が確定するものを「対照群」として扱い、そこでの的中率を相手の精度の目安にする。
 *
 * 出力: Desktop/条文割当_{法令名}_突合.csv
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const DESKTOP = process.env.USERPROFILE + '/Desktop';
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const NAME_TO_ID = {
  憲法: 'constitution',
  商法: 'commercial_code',
  会社法: 'company_act',
  行政手続法: 'admin_procedure',
  行政不服審査法: 'admin_appeal',
  行政事件訴訟法: 'admin_litigation',
  国家賠償法: 'state_liability',
  行政代執行法: 'admin_enforcement',
  地方自治法: 'local_autonomy',
  国家行政組織法: 'national_admin_org',
};

const norm = s =>
  (s ?? '')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s/g, '');

const normArt = a => {
  if (a === null || a === undefined || a === '' || a === 'null') return null;
  return norm(String(a)).replace(/^第/, '').replace(/条$/, '').replace(/条の/, 'の').replace(/-/g, 'の');
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

const main = async () => {
  const name = process.argv[2];
  const lawId = NAME_TO_ID[name];
  if (!lawId) {
    console.error(`法令名を指定してください: ${Object.keys(NAME_TO_ID).join(' / ')}`);
    process.exit(1);
  }

  const { rows } = await readJson(path.join(OUT, `gyosei_choices_${lawId}.json`));
  const law = (await readJson(path.join(HERE, `public/laws/${lawId}.json`))).articles;
  const ansPath = path.join(DESKTOP, `条文割当_${name}_回答.json`);
  let ans;
  try {
    ans = await readJson(ansPath);
  } catch {
    console.error(`回答ファイルが見つかりません: ${ansPath}`);
    process.exit(1);
  }

  const byKey = new Map(ans.map(a => [`${a.qId}|${a.choice}`, a]));
  const out = [];
  const tally = { 確定: 0, 高: 0, 中: 0, 要確認: 0, 割当なし: 0, 未回答: 0 };
  let controlTotal = 0;
  let controlHit = 0;

  for (const r of rows) {
    const a = byKey.get(`${r.qId}|${r.choice}`);
    if (!a) {
      tally.未回答++;
      out.push({ ...r, theirs: '', level: '未回答', flags: '回答に含まれていない', reason: '' });
      continue;
    }
    const art = normArt(a.article);
    if (art === null) {
      tally.割当なし++;
      out.push({ ...r, theirs: 'null', level: '割当なし', flags: '', reason: a.reason ?? '', conf: a.confidence ?? '' });
      continue;
    }

    const flags = [];
    const exists = !!law[art];
    if (!exists) flags.push(`第${art}条が${name}に存在しない`);

    const ov = exists ? overlap(r.text, law[art].text) : 0;

    // 選択肢に条番号が明示されていれば、そこで正解が確定する
    const explicit = [...String(r.text).matchAll(/第([0-9０-９]+)条/g)].map(m => norm(m[1]));
    let level;
    if (explicit.length === 1) {
      controlTotal++;
      if (explicit[0] === art.split('の')[0]) { controlHit++; level = '確定'; }
      else { level = '要確認'; flags.push(`肢に明示された第${explicit[0]}条と割当（第${art}条）が不一致`); }
    } else if (flags.length) {
      level = '要確認';
    } else if (ov >= 0.30) {
      level = '高';
    } else if (ov >= 0.15) {
      level = '中';
    } else {
      level = '要確認';
    }

    tally[level]++;
    out.push({
      ...r, theirs: art, caption: law[art]?.caption ?? '',
      overlap: ov.toFixed(2), conf: a.confidence ?? '', reason: a.reason ?? '',
      level, flags: flags.join(' / '),
    });
  }

  // 1問の全肢が同じ条文＝雑な割当の疑い
  const byQ = new Map();
  for (const o of out) {
    if (!o.theirs || o.theirs === 'null') continue;
    if (!byQ.has(o.qId)) byQ.set(o.qId, new Set());
    byQ.get(o.qId).add(o.theirs);
  }
  const suspicious = [...byQ.entries()].filter(([, s]) => s.size === 1).map(([q]) => q);

  const head = ['判定', '問題', '肢', '割当', '見出し', '一致度', '相手の自信', '要確認の理由', '相手の理由', '選択肢本文'];
  const csv = '\ufeff' + [head.join(',')]
    .concat(
      out
        .sort((a, b) => {
          const rank = v => ({ 要確認: 0, 未回答: 1, 中: 2, 割当なし: 3, 高: 4, 確定: 5 }[v.level] ?? 9);
          return rank(a) - rank(b) || a.qId.localeCompare(b.qId);
        })
        .map(o =>
          [o.level, o.qId, o.choice, o.theirs ?? '', o.caption ?? '', o.overlap ?? '',
           o.conf ?? '', o.flags ?? '', o.reason ?? '', (o.text ?? '').slice(0, 120)]
            .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
        ),
    ).join('\n');
  await writeFile(path.join(DESKTOP, `条文割当_${name}_突合.csv`), csv, 'utf-8');

  const total = rows.length;
  console.log(`${name}: ${total}肢`);
  for (const [k, v] of Object.entries(tally)) {
    if (v) console.log(`  ${k.padEnd(5)} ${String(v).padStart(4)}  (${Math.round((v / total) * 100)}%)`);
  }
  if (controlTotal) {
    console.log(`\n  対照群（肢に条番号が明示されているもの）: ${controlHit}/${controlTotal} 的中` +
      ` (${Math.round((controlHit / controlTotal) * 100)}%)  ← 相手の精度の目安`);
  } else {
    console.log('\n  対照群になる肢がなかった（条番号を明示した肢がない）');
  }
  if (suspicious.length) {
    console.log(`\n  ⚠ 全肢が同じ条文に割り当てられている問題 ${suspicious.length}件: ${suspicious.slice(0, 8).join(', ')}`);
  }
  console.log(`\n→ Desktop/条文割当_${name}_突合.csv（要確認が上に並びます）`);
};

main().catch(e => { console.error(e); process.exit(1); });
