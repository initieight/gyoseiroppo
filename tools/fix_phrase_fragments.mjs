#!/usr/bin/env node
/**
 * 閉じ括弧や句読点から始まっている出題箇所（phrases）の頭を、文の先頭まで戻す。
 *
 *   node tools/fix_phrase_fragments.mjs          … 検出するだけ
 *   node tools/fix_phrase_fragments.mjs --write  … 書き込む
 *
 * 「。」で条文本文を切って出題箇所を選んでいたため、
 * 「（法律の委任に基く命令、規則及び条例を含む。以下同じ。）」のように
 * 括弧の中に句点を含む条文で、
 * 「）により直接に命ぜられ、又は…」という断片がハイライトになっていた。
 *
 * 生成側（emit_law_highlights.mjs / emit_civil_highlights.mjs）は
 * 括弧を数える splitSentences に直したが、すでに書き出したデータには残っている。
 *
 * ■ 直すのは「先頭が ） ) 」 』 、 。 のもの」だけ
 *   短い出題箇所そのものは正常なデータなので触らない。
 *   直す場合も、伸ばすのは頭だけで、末尾は動かさない。
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HL = path.join(HERE, 'public', 'highlights');
const WRITE = process.argv.includes('--write');

/** 壊れた頭の判定 */
const BROKEN_HEAD = /^[）)」』、。・]/;

/**
 * 条文本文の文の開始位置を返す。
 * 「。」の直後が次の文の開始だが、括弧の中の「。」は文末とみなさない。
 */
function sentenceStarts(text) {
  const OPEN = '（(「『';
  const CLOSE = '）)」』';
  const starts = [0];
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (OPEN.includes(ch)) depth++;
    else if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    else if (ch === '\n') {
      depth = 0;
      starts.push(i + 1);
    } else if (ch === '。' && depth === 0) {
      starts.push(i + 1);
    }
  }
  return starts;
}

const main = async () => {
  const files = (await readdir(HL)).filter(f => /\.json$/.test(f));
  let total = 0;

  for (const f of files) {
    const hlPath = path.join(HL, f);
    const data = JSON.parse(await readFile(hlPath, 'utf-8'));
    if (!data.lawId || !data.articles) continue;
    const law = JSON.parse(
      await readFile(path.join(HERE, `public/laws/${data.lawId}.json`), 'utf-8'),
    ).articles;

    const fixed = [];
    for (const [key, entry] of Object.entries(data.articles)) {
      if (!Array.isArray(entry.phrases) || !entry.phrases.length) continue;
      const body = law[key]?.text;
      if (!body) continue;
      const starts = sentenceStarts(body);
      const next = [];
      for (const p of entry.phrases) {
        let out = p;
        if (BROKEN_HEAD.test(p)) {
          const at = body.indexOf(p);
          if (at > 0) {
            const from = starts.filter(s => s <= at).pop() ?? 0;
            out = body.slice(from, at + p.length).trim();
            fixed.push(`第${key}条: ${p.slice(0, 22)}… → ${out.slice(0, 22)}…`);
          }
        }
        if (!next.includes(out)) next.push(out);
      }
      entry.phrases = next;
    }

    if (fixed.length) {
      console.log(`${f}  ${fixed.length}件`);
      for (const x of fixed) console.log(`   ${x}`);
      total += fixed.length;
      if (WRITE) await writeFile(hlPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    }
  }

  console.log(`\n合計 ${total}件`);
  console.log(WRITE ? '✅ 書き込みました' : '（未書き込み。--write で反映）');
};

main().catch(e => { console.error(e); process.exit(1); });
