#!/usr/bin/env node
/**
 * 会社法・商法の機械監査で「要確認」になった肢を、別チャットでの
 * 独立照合に渡せる Markdown へまとめる。
 *
 * 法的判断は行わず、問題文・現在の割当・機械警告を転記するだけ。
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW_DIR = path.join(ROOT, 'tools', 'out', 'company_review');
const AUDIT_PATH = path.join(REVIEW_DIR, 'company_assignment_audit.csv');
const SOURCE_PATH = path.join(ROOT, 'tools', 'out', 'other_choices_shoji.json');
const OUTPUT_PATH = path.join(REVIEW_DIR, '条文割当_会社法商法_要確認14件_GPT入力.md');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(value);
      value = '';
    } else if (ch === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += ch;
    }
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ''));
    rows.push(row);
  }
  const headers = rows.shift().map((v, i) => (i === 0 ? v.replace(/^\ufeff/, '') : v));
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

const json = async p => JSON.parse(await readFile(p, 'utf8'));
const key = (qId, choice) => `${qId}|${choice}`;

const audit = parseCsv(await readFile(AUDIT_PATH, 'utf8')).filter(r => r['判定'] === '要確認');
const source = (await json(SOURCE_PATH)).rows;
const sourceByKey = new Map(source.map(r => [key(r.qId, r.choice), r]));

const answerFiles = (await readdir(REVIEW_DIR)).filter(f => /^条文割当_他資格_.+_回答\.json$/.test(f));
const answers = [];
for (const file of answerFiles) answers.push(...await json(path.join(REVIEW_DIR, file)));
const answerByKey = new Map(answers.map(r => [key(r.qId, r.choice), r]));

const out = [
  '# 会社法・商法｜機械監査「要確認」14肢の独立照合',
  '',
  '以下は、司法書士試験・予備試験（令和5～7年度）の条文割当について、機械監査で警告が出た肢です。',
  '',
  '## 依頼',
  '',
  '各肢について、現在の割当をいったん疑い、試験実施日に施行されていた法令に基づいて独立に確認してください。',
  '',
  '- 一次資料だけを使ってください。e-Gov法令検索の該当時点の会社法・商法と、必要な場合は法務省の公式試験問題を参照してください。',
  '- 解説サイト、予備校、個人ブログは根拠に使わないでください。',
  '- 問題文中に条番号が出ていても、それが問われている直接の根拠条文とは限りません。本文・準用・例外・登記事項を区別してください。',
  '- `law` は `会社法`、`商法`、`null` のいずれかです。別法令・判例だけが根拠なら `law` と `article` を `null` にしてください。',
  '- 判断できない場合は推測せず、`decision` を `unresolved`、`confidence` を `low` にしてください。',
  '- 現在の割当を維持する場合も、その割当を直接支える条文の項・号を理由に書いてください。',
  '',
  '## 出力形式',
  '',
  'JSON配列だけを返してください。',
  '',
  '```json',
  '[',
  '  {"qId":"yobi-R7-Q24","choice":"ウ","decision":"keep|change|unresolved","law":"会社法","article":"587","paragraph":"1","item":null,"confidence":"high|mid|low","primarySourceUrl":"e-GovのURL","reason":"直接の根拠と判断した理由"}',
  ']',
  '```',
  '',
  '## 要確認の肢',
  '',
];

for (const item of audit) {
  const id = item['問題'];
  const choice = item['肢'];
  const src = sourceByKey.get(key(id, choice));
  const ans = answerByKey.get(key(id, choice));
  if (!src || !ans) throw new Error(`元データが見つかりません: ${id}|${choice}`);
  out.push(
    `### ${id}・肢${choice}`,
    '',
    `**設問**：${src.stem}`,
    '',
    `**選択肢**：${src.text}`,
    '',
    `**現在の割当**：${ans.law ?? 'null'} ${ans.article ? `第${ans.article}条` : 'null'}（confidence: ${ans.confidence ?? ''}）`,
    '',
    `**現在の理由**：${ans.reason ?? ''}`,
    '',
    `**機械警告**：${item['要確認の理由'] || `本文との文字列一致度が低い（${item['一致度']}）`}`,
    '',
  );
}

await writeFile(OUTPUT_PATH, `${out.join('\n')}\n`, 'utf8');
console.log(`出力: ${OUTPUT_PATH}`);
console.log(`要確認: ${audit.length}肢`);
