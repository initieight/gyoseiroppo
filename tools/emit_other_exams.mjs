#!/usr/bin/env node
/**
 * 他資格試験（司法試験・予備試験・司法書士・宅建）の出題実績を取り込む。
 *
 *   node tools/emit_other_exams.mjs          … 内容の確認だけ
 *   node tools/emit_other_exams.mjs --write  … public/highlights/other_exams_civil_code.json に書き出す
 *
 * 入力
 *   minpo/public/highlights/question_spans.json
 *     選択肢単位で根拠条文・フレーズ・論点ラベルが付いたデータ。
 *     article → q_id（"shiho-R2-Q20" 形式）→ {phrases, note, choice_num, issue_label}
 *
 * ■ 使ってはいけない入力
 *   minpo/public/highlights/{shiho,shoshi,yobi,takken,all}.json は、
 *   キーワードにマッチしたら条文ブロック全体に加算する壊れた方式で作られている
 *   （行政書士の民法データで1問が平均7.4条に膨らんでいたのと同じ原因）。
 *   選択肢単位の question_spans.json だけを使うこと。
 *
 * ■ 検証状況
 *   行政書士分は独立判定まで通したが、他資格分は通していない。
 *   表示側で「未検証」であることを明示すること。
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPANS = process.env.USERPROFILE + '/project/minpo/public/highlights/question_spans.json';
const WRITE = process.argv.includes('--write');
const readJson = async p => JSON.parse(await readFile(p, 'utf-8'));

/** 取り込む試験。行政書士は独自パイプラインの結果を使うのでここには入れない */
const EXAMS = ['shiho', 'yobi', 'shoshi', 'takken'];
const QID = /^(shiho|yobi|shoshi|takken|gyosei)-(R\d+|H\d+)-Q(\d+)/;
const YEAR_ORDER = ['R2', 'R3', 'R4', 'R5', 'R6', 'R7'];

const main = async () => {
  const spans = await readJson(SPANS);
  const law = (await readJson(path.join(HERE, 'public/laws/civil_code.json'))).articles;

  const articles = {};
  const skipped = { malformed: new Set(), unknownArticle: new Set(), gyosei: 0 };

  for (const [art, byQ] of Object.entries(spans)) {
    if (!law[art]) {
      // 項が枝番として誤記録されているもの（例: 249の2 は民法249条2項）や、
      // 削除済みの条文。取り込まない。
      skipped.unknownArticle.add(art);
      continue;
    }
    for (const qid of Object.keys(byQ)) {
      const m = QID.exec(qid);
      if (!m) { skipped.malformed.add(qid); continue; }
      const [, exam, year, qNum] = m;
      if (exam === 'gyosei') { skipped.gyosei++; continue; }
      if (!EXAMS.includes(exam)) continue;

      const a = (articles[art] ??= { total: 0, byExam: {} });
      const e = (a.byExam[exam] ??= { count: 0, years: [], questions: [] });
      const label = `${year}-Q${qNum}`;
      if (!e.questions.includes(label)) {
        e.questions.push(label);
        e.count += 1;
        a.total += 1;
        if (!e.years.includes(year)) e.years.push(year);
      }
    }
  }

  // 整列
  const artNum = k => {
    const m = k.match(/^(\d+)(?:の(\d+))?/);
    return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 1000 : 0) : 1e9;
  };
  const out = {};
  for (const k of Object.keys(articles).sort((a, b) => artNum(a) - artNum(b))) {
    const a = articles[k];
    for (const e of Object.keys(a.byExam)) {
      a.byExam[e].years.sort((x, y) => YEAR_ORDER.indexOf(x) - YEAR_ORDER.indexOf(y));
      a.byExam[e].questions.sort();
    }
    out[k] = a;
  }

  // ── 集計の表示 ──
  const perExam = {};
  for (const a of Object.values(out)) {
    for (const [e, v] of Object.entries(a.byExam)) {
      (perExam[e] ??= { articles: 0, questions: new Set() });
      perExam[e].articles += 1;
      for (const q of v.questions) perExam[e].questions.add(q);
    }
  }
  console.log(`条文 ${Object.keys(out).length} 件に他資格の出題実績`);
  for (const e of EXAMS) {
    const p = perExam[e];
    if (p) console.log(`  ${e.padEnd(7)} ${String(p.articles).padStart(4)}条 / ${p.questions.size}問`);
  }
  const gyosei = (await readJson(path.join(HERE, 'public/highlights/r2_r7_civil_code.json'))).articles;
  const both = Object.keys(out).filter(k => gyosei[k]).length;
  console.log(`  行政書士と重なる ${both}条 / 他資格のみ ${Object.keys(out).length - both}条`);
  console.log(`  合計カバー ${new Set([...Object.keys(out), ...Object.keys(gyosei)]).size} / ${Object.keys(law).length}条`);
  console.log(`\n除外: 条文キー不明 ${skipped.unknownArticle.size}件 / q_id形式不正 ${skipped.malformed.size}件`);
  if (skipped.unknownArticle.size) console.log('  ', [...skipped.unknownArticle].join(', '));
  if (skipped.malformed.size) console.log('  ', [...skipped.malformed].join(', '));

  const dest = path.join(HERE, 'public/highlights/other_exams_civil_code.json');
  const body = JSON.stringify({ lawId: 'civil_code', exams: EXAMS, range: YEAR_ORDER, articles: out }, null, 2) + '\n';
  if (WRITE) {
    await writeFile(dest, body, 'utf-8');
    console.log(`\n✅ ${path.relative(HERE, dest)} を更新しました`);
  } else {
    console.log('\n（未書き込み。--write で反映）');
  }
};

main().catch(e => { console.error(e); process.exit(1); });
