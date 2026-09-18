#!/usr/bin/env node
/**
 * 他資格（司法書士・予備試験）の商法・会社法の条文割当を、機械的に検証する。
 *
 *   1. 返ってきた JSON 配列を Desktop/条文割当_他資格_{司法書士|予備試験}_{R2R3}_回答.json として保存
 *   2. node tools/verify_other_exams.mjs            … 置いてある回答すべて
 *      node tools/verify_other_exams.mjs 司法書士    … その試験の分だけ
 *      node tools/verify_other_exams.mjs --answers-dir=tools/out/company_review
 *
 * 行政書士の11法令と同じ考え方で検査する（tools/verify_law_review.mjs）。
 * 違うのは、1問の中で会社法・商法・手形法が混ざるため law も検査する点。
 *
 * 対象は tools/out/other_choices_*.json（商法・会社法／憲法）。
 *
 * 検査
 *  A. law が収録法令（会社法 / 商法 / 憲法）または null のいずれか
 *  B. その法令にその条文が実在するか
 *  C. 肢が条文本文をほぼ引き写している場合の正解（機械的に一意に決まる）  ← 対照群
 *  D. 肢本文と条文本文の3-gram重なり
 *  E. null の比率と、1問あたりの条文数
 *
 * 出力: Desktop/条文割当_他資格_突合.csv
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const option = name => {
  const prefix = `--${name}=`;
  const arg = process.argv.find(v => v.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
};
const answersDir = option('answers-dir')
  ? path.resolve(HERE, option('answers-dir'))
  : process.env.USERPROFILE + '/Desktop';
const outputPath = option('output')
  ? path.resolve(HERE, option('output'))
  : path.join(answersDir, '条文割当_他資格_突合.csv');

const LAW_NAME_TO_ID = { 会社法: 'company_act', 商法: 'commercial_code', 憲法: 'constitution' };

const norm = s => (s ?? '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\s/g, '');

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
  const only = process.argv.slice(2).find(v => !v.startsWith('--'));
  // tools/out の other_choices_*.json をまとめて読む（商法・会社法／憲法）
  const groupFiles = (await readdir(OUT)).filter(f => f.startsWith('other_choices_'));
  const rows = [];
  for (const f of groupFiles) rows.push(...(await readJson(path.join(OUT, f))).rows);
  const laws = {};
  for (const [name, id] of Object.entries(LAW_NAME_TO_ID)) {
    laws[name] = (await readJson(path.join(HERE, `public/laws/${id}.json`))).articles;
  }

  // 置いてある回答ファイルを全部読む
  const files = (await readdir(answersDir)).filter(
    f => /^条文割当_他資格_.+_回答\.json$/.test(f) && (!only || f.includes(only)),
  );
  if (!files.length) {
    console.error(`回答ファイルが見つかりません: ${DESKTOP}\\条文割当_他資格_*_回答.json`);
    process.exit(1);
  }
  const ans = [];
  for (const f of files) {
    const a = await readJson(path.join(answersDir, f));
    console.log(`読み込み: ${f}（${a.length}肢）`);
    ans.push(...a);
  }
  const byKey = new Map(ans.map(a => [`${a.qId}|${a.choice}`, a]));

  // 回答がある問題の肢だけを対象にする（バッチ単位で検証できるように）
  const answeredQ = new Set(ans.map(a => a.qId));
  const target = rows.filter(r => answeredQ.has(r.qId));

  // 対照群: 肢が特定の条文をほぼ引き写していて、2位と明確に差があるもの
  const best = new Map();
  for (const r of target) {
    const scored = [];
    for (const [name, arts] of Object.entries(laws)) {
      for (const [k, a] of Object.entries(arts)) scored.push([overlap(r.text, a.text ?? ''), name, k]);
    }
    scored.sort((x, y) => y[0] - x[0]);
    if (scored.length >= 2 && scored[0][0] >= 0.55 && scored[0][0] - scored[1][0] >= 0.15) {
      best.set(`${r.qId}|${r.choice}`, { law: scored[0][1], art: scored[0][2] });
    }
  }
  console.log(`\n対照群（条文をほぼ引き写している肢）: ${best.size} / ${target.length}肢\n`);

  const out = [];
  const tally = { 確定: 0, 高: 0, 中: 0, 要確認: 0, 割当なし: 0, 未回答: 0 };
  let controlTotal = 0;
  let controlHit = 0;

  for (const r of target) {
    const a = byKey.get(`${r.qId}|${r.choice}`);
    if (!a) {
      tally.未回答++;
      out.push({ ...r, theirs: '', level: '未回答', flags: '回答に含まれていない', reason: '' });
      continue;
    }
    const lawName = a.law === null || a.law === undefined || a.law === 'null' ? null : String(a.law).trim();
    const art = normArt(a.article);

    if (lawName === null || art === null) {
      tally.割当なし++;
      out.push({
        ...r, theirs: 'null', lawName: lawName ?? 'null', level: '割当なし',
        flags: lawName && art === null ? `law=${lawName} だが条文が null` : '',
        conf: a.confidence ?? '', reason: a.reason ?? '',
      });
      continue;
    }

    const flags = [];
    if (!laws[lawName]) flags.push(`law "${lawName}" は収録している法令の名前ではない`);
    const arts = laws[lawName] ?? {};
    const exists = !!arts[art];
    if (laws[lawName] && !exists) flags.push(`${lawName}に第${art}条が存在しない`);

    const ov = exists ? overlap(r.text, arts[art].text) : 0;
    const anchor = best.get(`${r.qId}|${r.choice}`);
    // 肢に条番号が明示されている場合はそちらを優先して対照群にする。
    // 司法書士の憲法は「憲法第21条第1項に違反する」のように肢が条番号を書いている
    const cited = [...new Set(
      [...String(r.text).matchAll(/第([0-9０-９]+)条(?:の([0-9０-９]+))?/g)]
        .map(m => norm(m[1]) + (m[2] ? `の${norm(m[2])}` : '')),
    )];
    let level;
    if (cited.length === 1) {
      controlTotal++;
      if (cited[0] === art) { controlHit++; level = '確定'; }
      else {
        level = '要確認';
        flags.push(`肢に明示された第${cited[0]}条と割当（${lawName}第${art}条）が不一致`);
      }
    } else if (anchor) {
      controlTotal++;
      if (anchor.law === lawName && anchor.art === art) { controlHit++; level = '確定'; }
      else {
        level = '要確認';
        flags.push(`肢がほぼ引き写している${anchor.law}第${anchor.art}条（${laws[anchor.law][anchor.art]?.caption ?? ''}）と割当（${lawName}第${art}条）が不一致`);
      }
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
      ...r, lawName, theirs: art, caption: arts[art]?.caption ?? '',
      overlap: ov.toFixed(2), conf: a.confidence ?? '', reason: a.reason ?? '',
      level, flags: flags.join(' / '),
    });
  }

  // 1問あたりの条文数
  const fan = new Map();
  for (const o of out) {
    if (!o.theirs || o.theirs === 'null') continue;
    if (!fan.has(o.qId)) fan.set(o.qId, new Set());
    fan.get(o.qId).add(`${o.lawName}${o.theirs}`);
  }
  const avg = fan.size ? [...fan.values()].reduce((s, v) => s + v.size, 0) / fan.size : 0;
  const suspicious = [...fan.entries()].filter(([, v]) => v.size === 1).map(([q]) => q);

  const head = ['判定', '問題', '肢', '法令', '割当', '見出し', '一致度', '相手の自信', '要確認の理由', '相手の理由', '選択肢本文'];
  const csv = '\ufeff' + [head.join(',')]
    .concat(
      out
        .sort((a, b) => {
          const rank = v => ({ 要確認: 0, 未回答: 1, 中: 2, 割当なし: 3, 高: 4, 確定: 5 }[v.level] ?? 9);
          return rank(a) - rank(b) || a.qId.localeCompare(b.qId) || String(a.choice).localeCompare(String(b.choice));
        })
        .map(o =>
          [o.level, o.qId, o.choice, o.lawName ?? '', o.theirs ?? '', o.caption ?? '', o.overlap ?? '',
           o.conf ?? '', o.flags ?? '', o.reason ?? '', (o.text ?? '').slice(0, 120)]
            .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
        ),
    ).join('\n');
  await writeFile(outputPath, csv, 'utf-8');

  const total = target.length;
  console.log(`${total}肢 / ${answeredQ.size}問`);
  for (const [k, v] of Object.entries(tally)) {
    if (v) console.log(`  ${k.padEnd(5)} ${String(v).padStart(4)}  (${Math.round((v / total) * 100)}%)`);
  }
  if (controlTotal) {
    console.log(`\n  対照群: ${controlHit}/${controlTotal} 的中 (${Math.round((controlHit / controlTotal) * 100)}%)  ← 相手の精度の目安`);
  } else {
    console.log('\n  対照群になる肢がなかった');
  }
  console.log(`  1問あたりの条文数 ${avg.toFixed(1)}`);
  if (suspicious.length) {
    console.log(`  条文が1つしか付かなかった問題 ${suspicious.length}件: ${suspicious.slice(0, 8).join(', ')}`);
  }
  console.log(`\n→ ${outputPath}（要確認が上に並びます）`);
};

main().catch(e => { console.error(e); process.exit(1); });
