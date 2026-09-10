#!/usr/bin/env node
/**
 * 条文データ・過去問データの整合性チェック
 *
 *   npm run validate-data
 *
 * ERROR が 1 件でもあれば exit 1（CI / デプロイ前チェックで使える）。
 * WARN は exit code に影響しない。
 *
 * 検査項目
 *  1. 法律マスタと実ファイルの対応（laws / highlights の欠落・余剰）
 *  2. lawId フィールドとファイル名の不一致
 *  3. 条文キーの重複・形式不正
 *  4. 条番号の欠番（1..最大条番号で存在しない番号）
 *  5. 存在しない条文への出題データ参照（dangling reference）
 *  6. count と years の整合（count < 年度数はありえない）
 *  7. 問題番号（questions）の形式ゆれ
 *  8. 年度ラベルの形式ゆれ
 *  9. 本文が空 / タイトル欠落
 * 10. phrases が本文に存在しない（ハイライトが効かない）
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// lib/laws.ts と重複しないよう、ID と名前だけをここで持つ
const LAWS = [
  ['constitution', '憲法'],
  ['admin_procedure', '行政手続法'],
  ['admin_appeal', '行政不服審査法'],
  ['admin_litigation', '行政事件訴訟法'],
  ['state_liability', '国家賠償法'],
  ['admin_enforcement', '行政代執行法'],
  ['national_admin_org', '国家行政組織法'],
  ['local_autonomy', '地方自治法'],
  ['civil_code', '民法'],
  ['commercial_code', '商法'],
  ['company_act', '会社法'],
];

const VALID_YEARS = new Set(['R2', 'R3', 'R4', 'R5', 'R6', 'R7']);
const ARTICLE_KEY = /^\d+(の\d+)*$/;          // 例: 12, 36の2
const RANGE_KEY = /^\d+:\d+$/;                 // 例: 771:787（削除条文の範囲）
const QUESTION_KEY = /^R[2-7]-Q\d{1,2}$/;      // 例: R5-Q28

const errors = [];
const warns = [];
const err = (law, msg) => errors.push(`[ERROR] ${law}: ${msg}`);
const warn = (law, msg) => warns.push(`[WARN ] ${law}: ${msg}`);

async function readJson(rel) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, rel), 'utf-8'));
  } catch (e) {
    return { __error: e.message };
  }
}

function articleNum(key) {
  const m = key.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  // ── 1. ファイルの存在確認 ─────────────────────────────────
  const lawFiles = new Set(
    (await readdir(path.join(ROOT, 'public/laws')).catch(() => [])).filter(f => f.endsWith('.json')),
  );
  const hlFiles = new Set(
    (await readdir(path.join(ROOT, 'public/highlights')).catch(() => [])).filter(f =>
      f.startsWith('r2_r7_'),
    ),
  );

  for (const [id] of LAWS) {
    if (!lawFiles.has(`${id}.json`)) err(id, `public/laws/${id}.json が無い`);
    if (!hlFiles.has(`r2_r7_${id}.json`)) err(id, `public/highlights/r2_r7_${id}.json が無い`);
  }
  const known = new Set(LAWS.map(([id]) => `${id}.json`));
  for (const f of lawFiles) {
    if (!known.has(f)) warn('-', `public/laws/${f} は法律マスタ(lib/laws.ts)に無い（URLから辿れない）`);
  }
  const knownHl = new Set(LAWS.map(([id]) => `r2_r7_${id}.json`));
  for (const f of hlFiles) {
    if (!knownHl.has(f)) warn('-', `public/highlights/${f} は法律マスタに無い`);
  }

  // ── 2〜10. 中身の検査 ─────────────────────────────────────
  let totalArticles = 0;
  let totalAsked = 0;

  for (const [id, name] of LAWS) {
    const law = await readJson(`public/laws/${id}.json`);
    if (law.__error) {
      err(id, `laws JSON が読めない: ${law.__error}`);
      continue;
    }
    const hl = await readJson(`public/highlights/r2_r7_${id}.json`);
    if (hl.__error) {
      err(id, `highlights JSON が読めない: ${hl.__error}`);
      continue;
    }

    if (law.lawId !== id) err(id, `laws の lawId が "${law.lawId}"（ファイル名と不一致）`);
    if (hl.lawId !== id) err(id, `highlights の lawId が "${hl.lawId}"（ファイル名と不一致）`);

    const arts = law.articles ?? {};
    const keys = Object.keys(arts);
    totalArticles += keys.length;
    if (keys.length === 0) err(id, '条文が 0 件');

    // 条文キーの形式
    const badKeys = keys.filter(k => !ARTICLE_KEY.test(k) && !RANGE_KEY.test(k));
    if (badKeys.length) err(id, `条文キーの形式が不正: ${badKeys.slice(0, 10).join(', ')}`);

    // 条番号の欠番
    const nums = new Set(keys.map(articleNum).filter(n => n !== null));
    const rangeCovered = new Set();
    for (const k of keys.filter(k => RANGE_KEY.test(k))) {
      const [a, b] = k.split(':').map(Number);
      for (let i = a; i <= b; i++) rangeCovered.add(i);
    }
    const max = Math.max(...nums);
    const missing = [];
    for (let i = 1; i <= max; i++) {
      if (!nums.has(i) && !rangeCovered.has(i)) missing.push(i);
    }
    if (missing.length) {
      warn(
        id,
        `第1条〜第${max}条のうち ${missing.length} 条が未収録（例: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ' …' : ''}）`,
      );
    }

    // 本文・タイトル
    for (const [k, a] of Object.entries(arts)) {
      if (!a || typeof a !== 'object') { err(id, `第${k}条 のデータが不正`); continue; }
      if (!a.title) err(id, `第${k}条 に title が無い`);
      if (typeof a.text !== 'string' || a.text.trim() === '') err(id, `第${k}条 の本文が空`);
    }

    // 出題データ
    const hlArts = hl.articles ?? {};
    const dangling = Object.keys(hlArts).filter(k => !(k in arts));
    if (dangling.length) {
      err(id, `存在しない条文への出題データ参照: ${dangling.slice(0, 10).join(', ')}（計${dangling.length}）`);
    }

    for (const [k, v] of Object.entries(hlArts)) {
      const count = v?.count ?? 0;
      const years = v?.years ?? [];
      if (!Number.isInteger(count) || count < 0) err(id, `第${k}条 の count が不正: ${count}`);
      if (!Array.isArray(years)) { err(id, `第${k}条 の years が配列でない`); continue; }
      if (count > 0) totalAsked++;

      // 同一年度に複数問出ることはあるので count >= 年度数。逆は矛盾。
      if (count < years.length) {
        err(id, `第${k}条 は count=${count} だが年度が${years.length}件（${years.join('/')}）`);
      }
      const badYears = years.filter(y => !VALID_YEARS.has(y));
      if (badYears.length) err(id, `第${k}条 の年度表記が不正: ${badYears.join(', ')}`);
      if (new Set(years).size !== years.length) warn(id, `第${k}条 の years に重複がある: ${years.join('/')}`);

      const qs = v?.questions ?? [];
      const badQ = qs.filter(q => !QUESTION_KEY.test(q));
      if (badQ.length) err(id, `第${k}条 の問題番号の形式が不正: ${badQ.slice(0, 5).join(', ')}`);
      // 問題番号の年度が years に含まれているか
      for (const q of qs.filter(q => QUESTION_KEY.test(q))) {
        const y = q.split('-')[0];
        if (!years.includes(y)) warn(id, `第${k}条 の問題番号 ${q} の年度が years(${years.join('/')}) に無い`);
      }

      // ハイライトが本文にヒットするか
      const text = arts[k]?.text ?? '';
      for (const p of v?.phrases ?? []) {
        const t = (p ?? '').trim();
        if (t && !text.includes(t)) {
          warn(id, `第${k}条 の出題箇所「${t.slice(0, 24)}${t.length > 24 ? '…' : ''}」が本文に一致しない`);
        }
      }
    }

    // 論点ブロック展開の検出：
    // count と years が一致するだけなら偶然ありうる（別の条文が同じ回数出ただけ）。
    // phrases（条文ごとに抽出された出題箇所）まで完全一致する場合に限り、
    // 1問が条文レンジ全体にコピーされた疑いとして扱う。
    const sigMap = new Map();
    for (const [k, v] of Object.entries(hlArts)) {
      if ((v?.count ?? 0) <= 0) continue;
      const sig = JSON.stringify([v.count, v.years ?? [], v.questions ?? [], v.phrases ?? []]);
      if (!sigMap.has(sig)) sigMap.set(sig, []);
      sigMap.get(sig).push(k);
    }
    const clustered = [...sigMap.values()].filter(ks => ks.length > 1);
    if (clustered.length) {
      const n = clustered.reduce((s, ks) => s + ks.length, 0);
      const asked = [...Object.values(hlArts)].filter(v => (v?.count ?? 0) > 0).length;
      const biggest = clustered.sort((a, b) => b.length - a.length)[0];
      warn(
        id,
        `${n}/${asked}条が他の条文と同一の出題データを持つ（論点ブロック単位で加算された疑い）。` +
          `最大クラスタ ${biggest.length}条: 第${biggest.slice(0, 6).join('・第')}条`,
      );
    }

    // 1問あたり何条に加算されているか
    const fan = new Map();
    for (const v of Object.values(hlArts)) {
      for (const q of v?.questions ?? []) fan.set(q, (fan.get(q) ?? 0) + 1);
    }
    if (fan.size) {
      const total = [...fan.values()].reduce((a, b) => a + b, 0);
      const avg = total / fan.size;
      const max = Math.max(...fan.values());
      // 1問は最大5肢あるので、平均5条までは構造上ありうる
      if (avg > 5) {
        warn(id, `1問あたり平均${avg.toFixed(1)}条に加算されている（最大${max}条／実問題数${fan.size}）。論点ブロック単位で加算された疑い`);
      }
    }

    // 法律名の表記ゆれ（データ側に法律名が紛れていないか）
    if (law.name && law.name !== name) warn(id, `laws の name "${law.name}" がマスタの "${name}" と不一致`);
  }

  // ── 他資格の出題実績（ファイルがある法令すべて）──
  // 民法だけだったが、会社法・商法にも司法書士と予備試験を入れたので法令ごとに回す
  for (const [id, name] of LAWS) {
    const other = await readJson(`public/highlights/other_exams_${id}.json`);
    if (other.__error) continue; // その法令には他資格データが無い
    const law = await readJson(`public/laws/${id}.json`);
    const arts = law.articles ?? {};
    const oa = other.articles ?? {};
    const dangling = Object.keys(oa).filter(k => !(k in arts));
    if (dangling.length) {
      err(id, `他資格データが存在しない条文を参照: ${dangling.slice(0, 10).join(', ')}`);
    }
    let badTotal = 0;
    const fan = new Map();
    for (const [k, v] of Object.entries(oa)) {
      const sum = Object.values(v.byExam ?? {}).reduce((s, e) => s + (e.count ?? 0), 0);
      if (sum !== v.total) badTotal++;
      for (const [exam, e] of Object.entries(v.byExam ?? {})) {
        if ((e.questions ?? []).length !== e.count) {
          err(id, `他資格 第${k}条 ${exam}: count=${e.count} だが問題番号が${(e.questions ?? []).length}件`);
        }
        for (const q of e.questions ?? []) fan.set(`${exam}-${q}`, (fan.get(`${exam}-${q}`) ?? 0) + 1);
      }
    }
    if (badTotal) err(id, `他資格データで total と内訳の合計が合わない条文が ${badTotal} 件`);
    const avg = fan.size ? [...fan.values()].reduce((a, b) => a + b, 0) / fan.size : 0;
    if (avg > 8) {
      warn(id, `他資格は1問あたり平均${avg.toFixed(1)}条に加算されている。ブロック展開の疑い`);
    }
    console.log(`他資格の出題実績（${name}）: ${Object.keys(oa).length}条 / ${fan.size}問 / 1問あたり平均${avg.toFixed(1)}条`);
  }

  // ── 結果出力 ──────────────────────────────────────────────
  console.log('─'.repeat(64));
  console.log(`収録: ${LAWS.length}法令 / 全${totalArticles}条 / 出題実績のある条文 ${totalAsked}条`);
  console.log('─'.repeat(64));

  const MAX_SHOW = 40;
  if (warns.length) {
    for (const w of warns.slice(0, MAX_SHOW)) console.log(w);
    if (warns.length > MAX_SHOW) console.log(`… ほか WARN ${warns.length - MAX_SHOW} 件`);
    console.log('');
  }
  if (errors.length) {
    for (const e of errors.slice(0, MAX_SHOW)) console.log(e);
    if (errors.length > MAX_SHOW) console.log(`… ほか ERROR ${errors.length - MAX_SHOW} 件`);
    console.log('');
  }

  console.log(`ERROR ${errors.length} 件 / WARN ${warns.length} 件`);
  if (errors.length) {
    console.log('❌ データ検証に失敗しました。');
    process.exit(1);
  }
  console.log('✅ データ検証OK（ERROR なし）');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
