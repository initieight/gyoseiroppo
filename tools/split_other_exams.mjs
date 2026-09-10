#!/usr/bin/env node
/**
 * 他資格試験（司法書士・予備試験）の商法・会社法の問題を、選択肢単位に切り出す。
 *
 *   node tools/split_other_exams.mjs
 *
 * 行政書士試験だけでは会社法22問・商法6問しかなく、条文が散って薄い。
 * 司法書士と予備試験を足すと会社法は6倍以上になる。
 *
 * ■ 入力
 *   minpo プロジェクトが過去問PDFから抽出した問題文。
 *   %USERPROFILE%/project/minpo/scripts/parsed_all_problems.json
 *
 *   この入力の is_minpo フラグは使わない。
 *   司法書士の判定が `q_num <= 17` になっていて、午前試験の実際の科目配列
 *   （憲法 問1〜3 / 民法 問4〜23 / 刑法 問24〜26 / 商法・会社法 問27〜35）と
 *   合っていないため。問番号から自分で判定する。
 *   （民法の question_spans.json 側は問4〜23で正しく作られているので、
 *     公開中の民法データには影響していない）
 *
 * ■ 出力
 *   tools/out/other_choices_shoji.json
 *   問題文を含むので tools/out/ は .gitignore 済み。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(HERE, 'tools', 'out');
const SRC = process.env.USERPROFILE + '/project/minpo/scripts/parsed_all_problems.json';

/**
 * 商法・会社法が出題される問番号の範囲。
 *   司法書士 午前: 問27〜35（会社法8問＋商法1問）
 *   予備試験 短答（民事系）: 問16〜30（民法 問1〜15 / 商法 問16〜30 / 民訴 問31〜45）
 * 手形法・小切手法の問題もこの範囲に入るが、収録している11法令に手形法はないので
 * 判定の段階で null になる（こちらでは落とさない）。
 */
const RANGES = [
  { exam: 'shoshi', name: '司法書士', from: 27, to: 35 },
  { exam: 'yobi', name: '予備試験', from: 16, to: 30 },
];

const KANA = 'アイウエオ';
const MIN_LEN = 150;

/** 問題文を「設問」と「肢」に分解する */
function splitChoices(questionText) {
  const t = String(questionText).replace(/\r/g, '');
  const marks = [];
  // 「ア 」「ア.」「ア．」/ 「1 」「1.」「1．」のどちらの形式もある。
  // 司法書士には教授と学生の対話形式があり、肢が「学生:ア はい。…」で始まる
  const at = (label, kind) => {
    const re = new RegExp(String.raw`(?:^|\n)[ \t　]*(?:学生[:：][ \t　]*)?${label}(?:[.．、]|[ \t　])`);
    const m = re.exec(t);
    // lineStart = 肢マーカーの行頭（設問の終わり / 前の肢の終わりに使う）
    // i        = マーカーを除いた本文の開始位置
    if (m) marks.push({ label, lineStart: m.index, i: m.index + m[0].length, kind });
  };
  for (let n = 1; n <= 5; n++) at(String(n), 'num');
  for (const k of KANA) at(k, 'kana');

  const num = marks.filter(m => m.kind === 'num');
  const kana = marks.filter(m => m.kind === 'kana');
  const used = (kana.length >= 3 ? kana : num).sort((a, b) => a.i - b.i);
  if (used.length < 3) return null;

  if (/空欄|当てはまる語句|語句の組合せ/.test(t.slice(0, used[0].lineStart))) return null;

  const stem = t.slice(0, used[0].lineStart).replace(/\s+/g, ' ').trim();
  const choices = used.map((m, j) => ({
    label: m.label,
    text: t
      // 次の肢はマーカーの行頭で切る。本文の開始位置で切ると末尾に「イ.」が残る
      .slice(m.i, j + 1 < used.length ? used[j + 1].lineStart : undefined)
      // 末尾にぶら下がる組合せの解答欄（「1.ア イ 2.ア オ …」「1 アイ 2 アウ …」）を落とす
      .replace(/\n[ 　]*1[.．]?[ 　]*[アイウエオ][\s\S]*$/, '')
      .replace(/\s+/g, ' ')
      .trim(),
  }));
  return { stem, choices };
}

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const src = JSON.parse(await readFile(SRC, 'utf-8'));

  const rows = [];
  const failed = [];
  for (const r of RANGES) {
    for (const e of src.filter(x => x.exam === r.exam)) {
      // 同じ問番号で複数拾っているものがある（注意書きやページ断片）。一番長いものを採る
      const byQ = new Map();
      for (const p of e.problems) {
        const q = Number(p.q_num);
        if (q < r.from || q > r.to) continue;
        const text = String(p.text ?? '');
        if (text.length < MIN_LEN) continue;
        if (!byQ.has(q) || byQ.get(q).length < text.length) byQ.set(q, text);
      }
      for (const [q, text] of [...byQ.entries()].sort((a, b) => a[0] - b[0])) {
        const qId = `${r.exam}-${e.year}-Q${q}`;
        const sp = splitChoices(text);
        if (!sp) { failed.push(qId); continue; }
        for (const c of sp.choices) {
          rows.push({
            qId, exam: r.exam, examName: r.name, year: e.year, qNum: `Q${q}`,
            choice: c.label, stem: sp.stem.slice(0, 220), text: c.text.slice(0, 420),
          });
        }
      }
    }
  }

  const qs = new Set(rows.map(x => x.qId));
  await writeFile(
    path.join(OUT, 'other_choices_shoji.json'),
    JSON.stringify({ laws: ['company_act', 'commercial_code'], rows }, null, 2),
    'utf-8',
  );

  for (const r of RANGES) {
    const mine = rows.filter(x => x.exam === r.exam);
    console.log(`${r.name.padEnd(5)} 問${r.from}〜${r.to}  ${new Set(mine.map(x => x.qId)).size}問 / ${mine.length}肢`);
  }
  console.log(`合計 ${qs.size}問 / ${rows.length}肢`);
  if (failed.length) console.log(`肢に分解できず: ${failed.join(', ')}`);
};

main().catch(e => { console.error(e); process.exit(1); });
