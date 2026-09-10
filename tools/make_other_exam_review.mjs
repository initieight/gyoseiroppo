#!/usr/bin/env node
/**
 * 他資格試験（司法書士・予備試験）の商法・会社法の肢に、根拠条文を割り当ててもらう入力を作る。
 *
 *   node tools/make_other_exam_review.mjs
 *
 * 行政書士の11法令と違い、この範囲は1問の中で会社法・商法・手形法が混ざる。
 * そのため条文番号だけでなく、どの法令かも答えてもらう。
 *
 * 出力（1回に貼る量を抑えるため、試験×2年度ずつに分ける）
 *   Desktop/条文割当_他資格_{司法書士|予備試験}_{R2R3|R4R5|R6R7}_入力.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const DESKTOP = process.env.USERPROFILE + '/Desktop';

const BATCHES = [
  { exam: 'shoshi', name: '司法書士', years: ['R2', 'R3'], tag: 'R2R3' },
  { exam: 'shoshi', name: '司法書士', years: ['R4', 'R5'], tag: 'R4R5' },
  { exam: 'shoshi', name: '司法書士', years: ['R6', 'R7'], tag: 'R6R7' },
  { exam: 'yobi', name: '予備試験', years: ['R2', 'R3'], tag: 'R2R3' },
  { exam: 'yobi', name: '予備試験', years: ['R4', 'R5'], tag: 'R4R5' },
  { exam: 'yobi', name: '予備試験', years: ['R6', 'R7'], tag: 'R6R7' },
];

const main = async () => {
  const { rows } = JSON.parse(
    await readFile(path.join(OUT, 'other_choices_shoji.json'), 'utf-8'),
  );

  for (const b of BATCHES) {
    const mine = rows.filter(r => r.exam === b.exam && b.years.includes(r.year));
    const byQ = new Map();
    for (const r of mine) {
      if (!byQ.has(r.qId)) byQ.set(r.qId, { stem: r.stem, choices: [] });
      byQ.get(r.qId).choices.push(r);
    }

    const md = [
      `# ${b.name} ${b.years.join('・')}｜商法・会社法の根拠条文の割当（${byQ.size}問 / ${mine.length}肢）`,
      '',
      '## お願い',
      '',
      `${b.name}試験（令和${b.years.map(y => y.replace('R', '')).join('・')}年度）の商法・会社法の問題です。`,
      '**選択肢ごとに、その記述の根拠となる条文を1つ**答えてください。',
      '',
      '### 条件',
      '',
      '- `law` は **`会社法`** か **`商法`** か **`null`** のいずれか。',
      '  - 会社法は第1条〜第979条、商法は第1条〜第850条の範囲です。',
      '  - **手形法・小切手法・民事訴訟法・民法・刑法など、会社法と商法以外が根拠の場合は `law` も `article` も `null`** としてください。',
      '    （この2法令しか収録していないサイトのデータを作るためです）',
      '  - 判例のみが根拠で条文が特定できない場合も `null` としてください。',
      '- 条文は**枝番まで正確に**答えてください（例: `327の2`、`179の3`、`846の2`）。親条文で丸めないでください。',
      '- 複数条文が関わる場合は、**その肢の記述が直接の根拠とする1条**を選んでください。',
      '- 自信の度合いを `high` / `mid` / `low` で付けてください。',
      '- なぜその条文なのかを**1行**で書いてください。',
      '',
      '### 注意',
      '',
      '既存の割当はありません。白紙から判断してください。',
      '分からないものを埋めるより、`low` や `null` を正直に付けてもらう方が有用です。',
      'こちらで条文の実在・本文との語彙一致を機械的に検証します。',
      '',
      '### 出力形式',
      '',
      '```json',
      '[',
      `  {"qId": "${[...byQ.keys()][0] ?? 'shoshi-R2-Q27'}", "choice": "ア", "law": "会社法", "article": "52", "confidence": "high", "reason": "52条1項の不足額填補責任"},`,
      `  {"qId": "${[...byQ.keys()][0] ?? 'shoshi-R2-Q27'}", "choice": "イ", "law": null, "article": null, "confidence": "high", "reason": "手形法が根拠"}`,
      ']',
      '```',
      '',
      'JSON配列だけを返してください。前置き・解説は不要です。',
      '',
      '---',
      '',
    ];

    for (const [qId, q] of byQ) {
      md.push(`## ${qId}`, '', `**設問**：${q.stem}`, '');
      for (const c of q.choices) md.push(`- **肢${c.choice}**：${c.text}`);
      md.push('');
    }

    const file = path.join(DESKTOP, `条文割当_他資格_${b.name}_${b.tag}_入力.md`);
    await writeFile(file, md.join('\n'), 'utf-8');
    console.log(
      `${b.name} ${b.tag}  ${String(byQ.size).padStart(2)}問 / ${String(mine.length).padStart(3)}肢  → ${path.basename(file)}`,
    );
  }
};

main().catch(e => { console.error(e); process.exit(1); });
