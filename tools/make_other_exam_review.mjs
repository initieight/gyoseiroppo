#!/usr/bin/env node
/**
 * 他資格試験（司法書士・予備試験）の肢に、根拠条文を割り当ててもらう入力を作る。
 *
 *   node tools/make_other_exam_review.mjs
 *   node tools/make_other_exam_review.mjs --years=R5,R6,R7 --group=shoji --out-dir=tools/out/company_review
 *
 * 行政書士の11法令と違い、1問の中で会社法・商法・手形法が混ざる。
 * そのため条文番号だけでなく、どの法令かも答えてもらう。
 *
 * 出力（1回に貼る量を抑えるため、試験×2年度ずつに分ける）
 *   Desktop/条文割当_他資格_{司法書士|予備試験}_{R2R3|R4R5|R6R7}_入力.md
 *   Desktop/条文割当_他資格_憲法_司法書士_入力.md
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const DEFAULT_OUTPUT_DIR = process.env.USERPROFILE + '/Desktop';

const option = name => {
  const prefix = `--${name}=`;
  const arg = process.argv.find(v => v.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
};

const selectedYears = (option('years') ?? 'R2,R3,R4,R5,R6,R7')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);
const selectedGroup = option('group');
const outputDirArg = option('out-dir');
const outputDir = outputDirArg
  ? path.resolve(HERE, outputDirArg)
  : DEFAULT_OUTPUT_DIR;

/** 条文の範囲（範囲外の番号を答えさせないために明示する） */
const MAX_ARTICLE = { 会社法: '979', 商法: '850', 憲法: '103' };

const VALID_YEARS = new Set(['R2', 'R3', 'R4', 'R5', 'R6', 'R7']);
for (const year of selectedYears) {
  if (!VALID_YEARS.has(year)) throw new Error(`未対応の年度です: ${year}`);
}
if (selectedGroup && !['kenpo', 'shoji'].includes(selectedGroup)) {
  throw new Error(`未対応のグループです: ${selectedGroup}`);
}

const chunks = (xs, size) => {
  const out = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

/**
 * 1本あたりの肢を減らすため、商法・会社法は年度ごとに分ける（1本45〜70肢）。
 * 憲法は1年3問しかないので3年ずつ（1本45肢）。
 * 貼る順番は 憲法 → 司法書士 → 予備試験。憲法は1法令が2本で完結する。
 */
const BATCHES = [
  ...chunks(selectedYears, 3).map(years => ({
    group: 'kenpo', exam: 'shoshi', name: '司法書士', years,
    file: `条文割当_他資格_憲法_司法書士_${years[0]}${years.at(-1)}`,
  })),
  ...selectedYears.map(y => ({
    group: 'shoji', exam: 'shoshi', name: '司法書士', years: [y],
    file: `条文割当_他資格_司法書士_${y}`,
  })),
  ...selectedYears.map(y => ({
    group: 'shoji', exam: 'yobi', name: '予備試験', years: [y],
    file: `条文割当_他資格_予備試験_${y}`,
  })),
].filter(b => !selectedGroup || b.group === selectedGroup);

const main = async () => {
  await mkdir(outputDir, { recursive: true });
  const cache = {};
  const load = async key => {
    if (!cache[key]) {
      cache[key] = JSON.parse(await readFile(path.join(OUT, `other_choices_${key}.json`), 'utf-8'));
    }
    return cache[key];
  };

  for (const b of BATCHES) {
    const { rows, laws } = await load(b.group);
    const mine = rows.filter(r => r.exam === b.exam && b.years.includes(r.year));
    if (!mine.length) { console.log(`${b.file}: 該当なし`); continue; }

    const byQ = new Map();
    for (const r of mine) {
      if (!byQ.has(r.qId)) byQ.set(r.qId, { stem: r.stem, choices: [] });
      byQ.get(r.qId).choices.push(r);
    }

    const lawChoices = laws.map(l => `**\`${l}\`**`).join(' か ') + ' か **`null`**';
    const ranges = laws.map(l => `${l}は第1条〜第${MAX_ARTICLE[l]}条`).join('、');
    const firstQ = [...byQ.keys()][0];
    const others = laws.includes('憲法')
      ? '法律（国会法・公職選挙法・裁判所法など）や判例のみが根拠で、憲法の条文が特定できない場合'
      : '手形法・小切手法・民事訴訟法・民法・刑法など、会社法と商法以外が根拠の場合';

    const md = [
      `# ${b.name} ${b.years.join('・')}｜${laws.join('・')}の根拠条文の割当（${byQ.size}問 / ${mine.length}肢）`,
      '',
      '## お願い',
      '',
      `${b.name}試験（令和${b.years.map(y => y.replace('R', '')).join('・')}年度）の${laws.join('・')}の問題です。`,
      '**選択肢ごとに、その記述の根拠となる条文を1つ**答えてください。',
      '',
      '### 条件',
      '',
      `- \`law\` は ${lawChoices} のいずれか。`,
      `  - ${ranges}の範囲です。範囲外の番号は答えないでください。`,
      `  - **${others}は、\`law\` も \`article\` も \`null\`** としてください。`,
      '    （収録している法令のデータを作るためです）',
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
      '**この回答は補助判定です。公開前に機械監査CSVと人間確認を通します。**',
      '',
      '### 出力形式',
      '',
      '```json',
      '[',
      `  {"qId": "${firstQ}", "choice": "ア", "law": "${laws[0]}", "article": "${laws.includes('憲法') ? '21' : '52'}", "confidence": "high", "reason": "…"},`,
      `  {"qId": "${firstQ}", "choice": "イ", "law": null, "article": null, "confidence": "high", "reason": "判例のみが根拠"}`,
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

    const file = path.join(outputDir, `${b.file}_入力.md`);
    await writeFile(file, md.join('\n'), 'utf-8');
    console.log(
      `${laws.join('・').padEnd(7)} ${b.name} ${b.years.join('')}  ${String(byQ.size).padStart(2)}問 / ${String(mine.length).padStart(3)}肢  → ${path.basename(file)}`,
    );
  }
  console.log(`\n出力先: ${outputDir}`);
};

main().catch(e => { console.error(e); process.exit(1); });
