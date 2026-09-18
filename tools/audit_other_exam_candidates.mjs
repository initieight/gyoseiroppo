#!/usr/bin/env node
/**
 * 司法書士・予備試験の各肢について、現行条文との文字列一致から候補をCSVに出す。
 *
 * これは条文割当の判定器ではない。候補と曖昧さを機械的に並べ、
 * 人間または補助判定役が一次資料と現行条文を確認するための監査資料を作る。
 *
 *   node tools/audit_other_exam_candidates.mjs --years=R5,R6,R7
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');

const option = name => {
  const prefix = `--${name}=`;
  const arg = process.argv.find(v => v.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
};
const years = (option('years') ?? 'R5,R6,R7').split(',').map(v => v.trim()).filter(Boolean);
const yearSet = new Set(years);
const output = option('output')
  ? path.resolve(HERE, option('output'))
  : path.join(OUT, 'company_review', 'company_candidates.csv');

const SOURCE_PAGES = {
  shoshi: {
    R5: 'https://www.moj.go.jp/MINJI/minji05_00541.html',
    R6: 'https://www.moj.go.jp/MINJI/minji05_00635.html',
    R7: 'https://www.moj.go.jp/MINJI/minji05_00715.html',
  },
  yobi: {
    R5: 'https://www.moj.go.jp/jinji/shihoushiken/jinji07_00151.html',
    R6: 'https://www.moj.go.jp/jinji/shihoushiken/jinji07_00228.html',
    R7: 'https://www.moj.go.jp/jinji/shihoushiken/jinji07_00287.html',
  },
};

const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));
const norm = s => String(s ?? '')
  .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  .replace(/[\s、。,.・「」『』（）()]/g, '');

function overlap(choice, article) {
  const a = norm(choice);
  const b = norm(article);
  if (a.length < 6 || b.length < 6) return 0;
  const grams = new Set();
  for (let i = 0; i <= a.length - 3; i++) grams.add(a.slice(i, i + 3));
  let hit = 0;
  for (const gram of grams) if (b.includes(gram)) hit++;
  return grams.size ? hit / grams.size : 0;
}

const csv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

const main = async () => {
  const source = await readJson(path.join(OUT, 'other_choices_shoji.json'));
  const rows = source.rows.filter(r => yearSet.has(r.year));
  const laws = [
    ['会社法', 'company_act'],
    ['商法', 'commercial_code'],
  ];
  const articles = [];
  for (const [lawName, lawId] of laws) {
    const data = (await readJson(path.join(HERE, `public/laws/${lawId}.json`))).articles;
    for (const [article, body] of Object.entries(data)) {
      if (norm(body.text) === '削除') continue;
      articles.push({ lawName, article, caption: body.caption ?? '', text: body.text ?? '' });
    }
  }

  const header = [
    '判定', 'フラグ', '試験', '年度', '問題', '肢', '一次資料',
    '候補1法令', '候補1条文', '候補1見出し', '候補1一致度',
    '候補2法令', '候補2条文', '候補2一致度',
    '候補3法令', '候補3条文', '候補3一致度', '選択肢本文',
  ];
  const lines = [header.map(csv).join(',')];
  const exactLines = [header.map(csv).join(',')];
  const reviewLines = [header.map(csv).join(',')];
  const machinePrefill = [];

  for (const row of rows) {
    const ranked = articles
      .map(a => ({ ...a, score: overlap(row.text, a.text) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const [a, b, c] = ranked;
    const flags = [];
    if ((a?.score ?? 0) < 0.15) flags.push('本文一致が弱い');
    if ((a?.score ?? 0) - (b?.score ?? 0) < 0.05) flags.push('候補差が小さい');
    if (/第[0-9０-９]+条/.test(row.text)) flags.push('肢に条番号明示');

    const isExact = (a?.score ?? 0) >= 0.55 && (a?.score ?? 0) - (b?.score ?? 0) >= 0.15;
    const values = [
      isExact ? '機械的一致・判定必要' : '判定必要', flags.join(' / '),
      row.examName, row.year, row.qId, row.choice,
      SOURCE_PAGES[row.exam]?.[row.year] ?? '',
      a?.lawName, a?.article, a?.caption, a?.score.toFixed(3),
      b?.lawName, b?.article, b?.score.toFixed(3),
      c?.lawName, c?.article, c?.score.toFixed(3), row.text,
    ];
    const line = values.map(csv).join(',');
    lines.push(line);
    (isExact ? exactLines : reviewLines).push(line);
    if (isExact) {
      machinePrefill.push({
        qId: row.qId,
        choice: row.choice,
        law: a.lawName,
        article: a.article,
        confidence: 'machine_exact',
        reviewed: false,
        reason: `条文本文との3-gram一致度${a.score.toFixed(3)}、次点との差${(a.score - b.score).toFixed(3)}`,
      });
    }
  }

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `\ufeff${lines.join('\n')}\n`, 'utf-8');
  const exactOutput = path.join(path.dirname(output), 'company_exact_matches.csv');
  const reviewOutput = path.join(path.dirname(output), 'company_manual_review.csv');
  const prefillOutput = path.join(path.dirname(output), 'company_machine_prefill.json');
  await Promise.all([
    writeFile(exactOutput, `\ufeff${exactLines.join('\n')}\n`, 'utf-8'),
    writeFile(reviewOutput, `\ufeff${reviewLines.join('\n')}\n`, 'utf-8'),
    writeFile(prefillOutput, `${JSON.stringify(machinePrefill, null, 2)}\n`, 'utf-8'),
  ]);
  console.log(`${lines.length - 1}肢を出力: ${output}`);
  console.log(`  機械的一致（要人間確認） ${exactLines.length - 1}肢: ${exactOutput}`);
  console.log(`  個別判定が必要          ${reviewLines.length - 1}肢: ${reviewOutput}`);
  console.log(`  補助判定用JSON: ${prefillOutput}`);
  console.log('全行「判定必要」。候補は文字列一致であり、法的な条文割当ではありません。');
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
