#!/usr/bin/env node
/**
 * 憲法・商法・会社法の選択肢に、根拠条文を割り当ててもらうための入力を作る。
 *
 *   node tools/make_law_review.mjs
 *
 * 民法と違い、この3法令には既存の割当が一切ない。
 * そのため「こちらの案を検証してもらう」のではなく、
 * 「白紙から割り当ててもらい、こちらは機械的に検証する」形にする。
 * （CLAUDE.md の役割分担: Claude Code = 実行役 / 補助判定役 = 別モデル）
 *
 * 出力
 *   Desktop/条文割当_{法令名}_入力.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const DESKTOP = process.env.USERPROFILE + '/Desktop';
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const SUBJECTS = [
  { lawId: 'constitution',       name: '憲法',           maxArticle: '103' },
  { lawId: 'commercial_code',    name: '商法',           maxArticle: '850' },
  { lawId: 'company_act',        name: '会社法',         maxArticle: '979' },
  // 行政法。行政書士試験で最大の科目
  { lawId: 'admin_procedure',    name: '行政手続法',     maxArticle: '46' },
  { lawId: 'admin_appeal',       name: '行政不服審査法', maxArticle: '87' },
  { lawId: 'admin_litigation',   name: '行政事件訴訟法', maxArticle: '46' },
  { lawId: 'state_liability',    name: '国家賠償法',     maxArticle: '6' },
  { lawId: 'admin_enforcement',  name: '行政代執行法',   maxArticle: '6' },
  { lawId: 'local_autonomy',     name: '地方自治法',     maxArticle: '299' },
  { lawId: 'national_admin_org', name: '国家行政組織法', maxArticle: '25' },
];

const main = async () => {
  for (const s of SUBJECTS) {
    const { rows } = await readJson(path.join(OUT, `gyosei_choices_${s.lawId}.json`));
    const law = (await readJson(path.join(HERE, `public/laws/${s.lawId}.json`))).articles;

    const byQ = new Map();
    for (const r of rows) {
      if (!byQ.has(r.qId)) byQ.set(r.qId, { stem: r.stem, choices: [] });
      byQ.get(r.qId).choices.push(r);
    }

    const md = [
      `# ${s.name}｜行政書士試験 過去問の根拠条文の割当（${byQ.size}問 / ${rows.length}肢）`,
      '',
      '## お願い',
      '',
      `行政書士試験（令和2〜7年度）の${s.name}の問題です。`,
      `**選択肢ごとに、その記述の根拠となる${s.name}の条文を1つ**答えてください。`,
      '',
      '### 条件',
      '',
      `- 条文は**枝番まで正確に**答えてください（例: \`327の2\`、\`466の2\`）。親条文で丸めないでください。`,
      `- ${s.name}の条文は第1条〜第${s.maxArticle}条の範囲です。範囲外の番号は答えないでください。`,
      '- **判例のみが根拠で、対応する条文が特定できない場合は `null`** としてください。',
      `  ${s.name === '憲法' ? '憲法は判例ベースの出題が多いので、null が多くなって構いません。' : '無理に条文を当てはめないでください。'}`,
      '- 他の法令（会社法・商法・民法など）が根拠の場合も `null` としてください。',
      '- 複数条文が関わる場合は、**その選択肢の記述が直接の根拠とする1条**を選んでください。',
      '- 自信の度合いを `high` / `mid` / `low` で付けてください。',
      '- なぜその条文なのかを**1行**で書いてください。',
      '',
      '### 注意',
      '',
      '既存の割当はありません。白紙から判断してください。',
      '分からないものを埋めるより、`low` や `null` を正直に付けてもらう方が有用です。',
      'こちらで条文の実在・見出しとの整合・本文との語彙一致を機械的に検証します。',
      '',
      '### 出力形式',
      '',
      '```json',
      '[',
      `  {"qId": "R2-Q37", "choice": "ア", "article": "25", "confidence": "high", "reason": "発起人の株式引受義務そのもの"},`,
      `  {"qId": "R2-Q37", "choice": "イ", "article": null, "confidence": "high", "reason": "設立取消しの訴えは会社法に規定がない"}`,
      ']',
      '```',
      '',
      'JSON配列だけを返してください。前置き・解説は不要です。',
      '',
      '---',
      '',
    ];

    for (const [qId, q] of byQ) {
      const multi = q.choices.some(c => c.multiLaw);
      md.push(`## ${qId}`, '');
      if (multi) {
        md.push(`> この問題は複数の法令にまたがります。${s.name}が根拠でない肢は \`null\` としてください。`, '');
      }
      md.push(`**設問**：${q.stem}`, '');
      for (const c of q.choices) md.push(`- **肢${c.choice}**：${c.text}`);
      md.push('');
    }

    const file = path.join(DESKTOP, `条文割当_${s.name}_入力.md`);
    await writeFile(file, md.join('\n'), 'utf-8');
    console.log(`${s.name.padEnd(4)} ${byQ.size}問 / ${rows.length}肢  （収録条文 ${Object.keys(law).length}）→ ${path.basename(file)}`);
  }
};

main().catch(e => { console.error(e); process.exit(1); });
