#!/usr/bin/env node
/**
 * 選択肢→条文の割当を、機械的に検証できる範囲で検証する。
 *
 *   node tools/verify_civil_choices.mjs
 *
 * 「私（Claude）の法的判断」に依存しない指標だけで信頼度を出し、
 * 判断が要るものを最小件数に絞る。
 *
 * 指標
 *  A. 条文が民法に実在するか
 *  B. article_caption が実際の条文見出しと一致するか（条番号の取り違えを検出）
 *  C. 選択肢テキストと条文本文の3-gram重なり
 *     ※判例ベースの肢は低く出るので、単独では誤りの根拠にしない
 *  D. 選択肢テキストに「第○条」の明示があり、割当と一致するか
 *  E. 論点メモ(note)と条文本文の重なり
 *
 * 出力: tools/out/verify.csv
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

const norm = s =>
  (s ?? '')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s/g, '');

const KANA = 'アイウエオ';

/** 問題文から選択肢の本文を切り出す */
function extractChoice(questionText, choice) {
  if (!questionText || !choice) return '';
  const t = String(questionText).replace(/\r/g, '');

  const markerAt = marker => {
    // 行頭（または文字列先頭）のマーカー＋区切り
    const re = new RegExp(String.raw`(?:^|\n)[ \t　]*` + marker + String.raw`[ \t　]`);
    const m = re.exec(t);
    return m ? m.index + m[0].length : -1;
  };

  if (/^[1-5]$/.test(choice)) {
    const n = Number(choice);
    const start = markerAt(String(n));
    if (start < 0) return '';
    const end = n < 5 ? markerAt(String(n + 1)) : -1;
    return t.slice(start, end > start ? end : undefined).trim();
  }

  const i = KANA.indexOf(choice);
  if (i >= 0) {
    const start = markerAt(KANA[i]);
    if (start < 0) return '';
    const end = i + 1 < KANA.length ? markerAt(KANA[i + 1]) : -1;
    return t.slice(start, end > start ? end : undefined).trim();
  }
  return '';
}

/** 3-gram の重なり率 */
function overlap(a, b) {
  const A = norm(a);
  const B = norm(b);
  if (A.length < 6 || B.length < 6) return 0;
  const grams = new Set();
  for (let i = 0; i <= A.length - 3; i++) grams.add(A.slice(i, i + 3));
  if (!grams.size) return 0;
  let hit = 0;
  for (const g of grams) if (B.includes(g)) hit++;
  return hit / grams.size;
}

const main = async () => {
  const { rows, questionText } = await readJson(path.join(OUT, 'civil_choices.json'));
  const law = (await readJson(path.join(HERE, 'public/laws/civil_code.json'))).articles;

  const out = [];
  const tally = { 高: 0, 中: 0, 要判定: 0, 割当なし: 0 };
  let extractFail = 0;

  for (const r of rows) {
    const chText = extractChoice(questionText[r.qId], r.choice);
    if (!chText) extractFail++;

    // 割当そのものが無い肢（元データが null）は検証対象外
    if (!r.article || r.article === 'null') {
      tally.割当なし++;
      out.push({
        level: '割当なし', ...r, caption: '', overlap: '', noteOverlap: '',
        captionOk: '', flags: '元データに条文の割当なし（判例のみの肢など）',
        choiceText: chText.replace(/\s/g, '').slice(0, 100),
      });
      continue;
    }

    const art = law[r.article];
    const flags = [];
    if (!art) flags.push(`第${r.article}条が民法に存在しない`);

    let captionOk = null;
    if (art && r.caption) {
      captionOk = norm(art.caption) === norm(r.caption);
      if (!captionOk) {
        flags.push(`見出し不一致（データ:${r.caption} / 実際:${art.caption || 'なし'}）`);
      }
    }

    const ov = art ? overlap(chText, art.text) : 0;
    const noteOv = art && r.note ? overlap(r.note, art.text) : null;

    const explicit = [...chText.matchAll(/第([0-9０-９]+)条/g)].map(m => norm(m[1]));
    const explicitOk = explicit.length ? explicit.includes(r.article) : null;
    if (explicitOk === false) {
      flags.push(`肢に明示された第${explicit.join('・')}条と割当（第${r.article}条）が不一致`);
    }

    let level;
    if (flags.length) level = '要判定';
    else if (explicitOk === true) level = '高';
    else if (captionOk === true && (ov >= 0.12 || (noteOv ?? 0) >= 0.2)) level = '高';
    else if (ov >= 0.2) level = '高';
    else if (captionOk === true || ov >= 0.1) level = '中';
    else level = '要判定';

    tally[level]++;
    out.push({
      level, ...r,
      caption: art?.caption ?? '',
      captionOk: captionOk === null ? '' : captionOk ? 'OK' : 'NG',
      overlap: ov.toFixed(2),
      noteOverlap: noteOv === null ? '' : noteOv.toFixed(2),
      flags: flags.join(' / '),
      choiceText: chText.replace(/\s/g, '').slice(0, 100),
    });
  }

  const head = [
    '信頼度', '問題', '肢', '条文', '見出し', '論点メモ', '正解肢',
    '見出し照合', '本文重なり', 'メモ重なり', '要判定の理由', '選択肢本文(先頭100字)',
  ];
  const csv = [head.join(',')]
    .concat(
      out.map(o =>
        [o.level, o.qId, o.choice, o.article, o.caption, o.note, o.correct === true ? '○' : '',
         o.captionOk, o.overlap, o.noteOverlap, o.flags, o.choiceText]
          .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    )
    .join('\n');
  await writeFile(path.join(OUT, 'verify.csv'), '﻿' + csv, 'utf-8');

  console.log(`検証 ${out.length} 件`);
  for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(6)} ${v}`);
  console.log(`  選択肢テキスト抽出失敗: ${extractFail}`);
  console.log('\n→ tools/out/verify.csv');
};

main().catch(e => {
  console.error(e);
  process.exit(1);
});
