import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  EXAM_RANGE,
  LAWS,
  isLawId,
  lawMeta,
  getLawData,
  getHighlightData,
  sortedArticleKeys,
  isDeletedArticle,
  articleHref,
  articleLabel,
  countBasis,
  countSentence,
  getOtherExamData,
  SITE_NAME,
  type Segment,
  type LawArticle,
} from '@/lib/laws';
import { PhraseJumpList, LegendToggle } from './ArticleInteractive';
import KouzaNudge from '@/components/kouza/KouzaNudge';
import CountBasisNotice from '@/components/CountBasisNotice';
import { OtherExamBlock } from '@/components/OtherExams';

export const dynamicParams = false;

export async function generateStaticParams() {
  const params: { lawId: string; article: string }[] = [];
  for (const law of LAWS) {
    const data = await getLawData(law.id);
    for (const key of Object.keys(data.articles)) {
      params.push({ lawId: law.id, article: key });
    }
  }
  return params;
}

// ── HTML 生成 ────────────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** フレーズ（出題箇所）をハイライトし、ジャンプ用の id を振る */
function applyPhrasesWithAnchors(rawText: string, phrases: string[]) {
  const unique = Array.from(
    new Set((phrases ?? []).map(p => (p ?? '').trim()).filter(p => p.length > 0)),
  );
  const displayList = unique
    .map((p, idx) => {
      const pos = rawText.indexOf(p);
      return { p, pos: pos === -1 ? Number.MAX_SAFE_INTEGER : pos, idx };
    })
    .sort((a, b) => (a.pos !== b.pos ? a.pos - b.pos : a.idx - b.idx))
    .map(x => x.p);

  let html = escHtml(rawText);
  for (const phrase of [...displayList].sort((a, b) => b.length - a.length)) {
    const esc = escHtml(phrase);
    if (!esc || !html.includes(esc)) continue;
    html = html.split(esc).join(`<span class="hl">${esc}</span>`);
  }
  for (let i = 0; i < displayList.length; i++) {
    const esc = escHtml(displayList[i]);
    const token = `<span class="hl">${esc}</span>`;
    if (!esc || !html.includes(token)) continue;
    html = html.replace(token, `<span class="hl" id="hl-${i}">${esc}</span>`);
  }
  return { html: html.replace(/\n/g, '<br>'), displayList };
}

function segmentsToHtml(segments: Segment[]): string {
  return segments
    .map(seg => {
      const t = escHtml(seg.text);
      if (seg.type === 'req') return `<span class="seg-req">${t}</span>`;
      if (seg.type === 'eff') return `<span class="seg-eff">${t}</span>`;
      return t.replace(/\n/g, '<br>');
    })
    .join('');
}

/**
 * 要件・効果ハイライトを出すかどうか。
 * 条文全体が片方の色で塗られると情報量がゼロで誤解を招くため、
 * 「要件と効果の両方が抽出できている条文」だけで表示する。
 */
function hasUsefulSegments(art: LawArticle): boolean {
  const types = new Set(
    (art.segments ?? []).filter(s => (s.text ?? '').trim().length > 0).map(s => s.type),
  );
  return types.has('req') && types.has('eff');
}

function starLabel(count: number): string {
  return count <= 0 ? '' : '★'.repeat(Math.min(count, 3));
}

// ── メタデータ ───────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { lawId: string; article: string };
}): Promise<Metadata> {
  const { lawId } = params;
  const articleKey = decodeURIComponent(params.article);
  if (!isLawId(lawId)) return { title: 'ページが見つかりません' };

  const [lawData, hl, other] = await Promise.all([
    getLawData(lawId),
    getHighlightData(lawId),
    getOtherExamData(lawId),
  ]);
  const art = lawData.articles[articleKey];
  if (!art) return { title: 'ページが見つかりません' };
  const otherTotal = other.articles[articleKey]?.total ?? 0;

  const name = lawMeta(lawId)!.name;
  const h = hl.articles?.[articleKey];
  const count = h?.count ?? 0;
  const years = h?.years ?? [];
  const deleted = isDeletedArticle(art);

  // タイトルは検索結果で切れない長さに抑える（全角30字前後を上限とする）
  const head = `${name}${articleLabel(articleKey) ?? art.title}`;
  const caption = art.caption ?? '';
  const len = head.length + caption.length;
  const title =
    caption && len <= 25 ? `${head}${caption}｜${SITE_NAME}`
    : caption && len <= 34 ? `${head}${caption}`
    : `${head}｜行政書士試験の出題条文`;

  const description = deleted
    ? `${name}${art.title}（削除）`
    : count > 0
      ? countBasis(lawId) === 'choice'
        ? `${head}${caption}の条文本文。行政書士試験${EXAM_RANGE}の過去問${count}問で根拠条文になっています（${years.join('・')}）。${otherTotal > 0 ? `他資格でものべ${otherTotal}問。` : ''}過去問で問われた箇所をハイライト表示。`
        : `${head}${caption}の条文本文。行政書士試験では${EXAM_RANGE}の過去問で${count}回（${years.join('・')}）出題されています。過去問で問われた箇所をハイライト表示。`
      : otherTotal > 0
        ? `${head}${caption}の条文本文。行政書士試験の過去問（${EXAM_RANGE}）では出題実績が確認できていませんが、司法試験・司法書士などの他資格ではのべ${otherTotal}問で問われています。`
        : `${head}${caption}の条文本文。行政書士試験の過去問（${EXAM_RANGE}）では出題実績が確認できていません。`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: articleHref(lawId, articleKey) },
    // 「削除」だけの条文は中身が無いのでインデックス対象外
    robots: deleted ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: articleHref(lawId, articleKey) },
  };
}

// ── ページ ───────────────────────────────────────────────────
export default async function ArticlePage({
  params,
}: {
  params: { lawId: string; article: string };
}) {
  const { lawId } = params;
  const articleKey = decodeURIComponent(params.article);
  if (!isLawId(lawId)) notFound();

  const [lawData, hl, other] = await Promise.all([
    getLawData(lawId),
    getHighlightData(lawId),
    getOtherExamData(lawId),
  ]);
  const art = lawData.articles[articleKey];
  if (!art) notFound();
  const otherExam = other.articles[articleKey];

  const meta = lawMeta(lawId)!;
  const h = hl.articles?.[articleKey];
  const count = h?.count ?? 0;
  const years = h?.years ?? [];
  const phrases = h?.phrases ?? [];
  const questions = Array.from(new Set(h?.questions ?? []));
  const correctCount = h?.correctCount ?? 0;

  const useSegments = hasUsefulSegments(art);
  const { html: phraseHtml, displayList } = useSegments
    ? { html: '', displayList: [] as string[] }
    : applyPhrasesWithAnchors(art.text ?? '', phrases);
  const articleHtml = useSegments ? segmentsToHtml(art.segments!) : phraseHtml;

  // 前後の条文
  const keys = sortedArticleKeys(lawData);
  const idx = keys.indexOf(articleKey);
  const prevKey = idx > 0 ? keys[idx - 1] : null;
  const nextKey = idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null;
  const prevArt = prevKey ? lawData.articles[prevKey] : null;
  const nextArt = nextKey ? lawData.articles[nextKey] : null;

  const hasRanking = Object.values(hl.articles ?? {}).some(a => (a?.count ?? 0) > 0);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
      <style>{`
        .hl { background: #fef08a; border-radius: 2px; padding: 0 1px; }
        .seg-req { background: #fef9c3; border-bottom: 2px solid #eab308; border-radius: 2px; padding: 0 1px; }
        .seg-eff { background: #dcfce7; border-bottom: 2px solid #16a34a; border-radius: 2px; padding: 0 1px; }
      `}</style>

      {/* パンくず */}
      <nav aria-label="パンくず" className="mb-4 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link href={`/law/${lawId}`} className="text-blue-600 hover:underline">{meta.name}</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">{articleLabel(articleKey) ?? art.title}</span>
      </nav>

      {/* タイトル */}
      <h1 className="text-xl font-bold text-gray-800 mb-0.5">
        {meta.name} {art.title}
        {articleLabel(articleKey) && (
          <span className="ml-2 text-sm font-normal text-gray-400">
            （{meta.name}{articleLabel(articleKey)!.replace('第', '')}）
          </span>
        )}
      </h1>
      {art.caption && <p className="text-sm text-gray-600 mb-3">{art.caption}</p>}

      {/* 出題情報 */}
      {count > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-yellow-500 font-bold text-base" title={countSentence(lawId, count)}>
            {starLabel(count)}
          </span>
          <span className="text-xs text-gray-600">
            {countSentence(lawId, count)}
            {correctCount > 0 && (
              <span className="text-gray-500">（うち{correctCount}問は正解肢の根拠）</span>
            )}
          </span>
          {years.map(y => (
            <span key={y} className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium">
              {y}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-xs text-gray-500">
          行政書士試験 {EXAM_RANGE} では出題実績が確認できていません
          {otherExam && otherExam.total > 0 && '（他資格では問われています）'}
        </p>
      )}

      {/* 出題問題番号 */}
      {questions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {questions.map(q => (
            <span key={q} className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
              {q}
            </span>
          ))}
        </div>
      )}

      {/* 試験傾向注記は事実性が未検証のため撤去（データは civil_code.json に残置） */}

      <OtherExamBlock data={otherExam} />

      {count > 0 && <CountBasisNotice lawId={lawId} />}

      {useSegments && <LegendToggle />}
      {!useSegments && <PhraseJumpList phrases={displayList} />}

      {/* 条文本文 */}
      <div
        className="text-[15px] leading-8 text-gray-800"
        dangerouslySetInnerHTML={{ __html: articleHtml }}
      />

      {/* 前後の条文 */}
      <nav aria-label="前後の条文" className="mt-10 grid grid-cols-2 gap-3">
        {prevKey && prevArt ? (
          <Link
            href={articleHref(lawId, prevKey)}
            className="min-h-[56px] flex flex-col justify-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <span className="text-[11px] text-gray-400">← 前の条文</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{prevArt.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {nextKey && nextArt ? (
          <Link
            href={articleHref(lawId, nextKey)}
            className="min-h-[56px] flex flex-col justify-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-right"
          >
            <span className="text-[11px] text-gray-400">次の条文 →</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{nextArt.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* 一覧・ランキングへ */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/law/${lawId}`}
          className="flex-1 min-w-[140px] text-center min-h-[48px] flex items-center justify-center px-4 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {meta.name} 条文一覧
        </Link>
        {hasRanking && (
          <Link
            href={`/ranking/${lawId}`}
            className="flex-1 min-w-[140px] text-center min-h-[48px] flex items-center justify-center px-4 rounded-lg border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-800 hover:bg-blue-100"
          >
            出題ランキング
          </Link>
        )}
      </div>

      {/* アフィリエイト（控えめ・従来どおり民法ページのみ） */}
      {lawId === 'civil_code' && count > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 mb-2">
            📚 テキストで深掘り（Amazonアソシエイトとして適格販売により収入を得ています）
          </p>
          <a
            href="https://www.amazon.co.jp/s?k=%E8%A1%8C%E6%94%BF%E6%9B%B8%E5%A3%AB+%E6%B0%91%E6%B3%95+%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88&tag=gyoseiroppo-22"
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-block text-xs text-blue-500 hover:underline py-2"
          >
            Amazon で行政書士民法テキストを探す →
          </a>
        </div>
      )}

      {/* 講座比較への導線。条文本文からは離した位置に置く */}
      <KouzaNudge variant="article" />
    </main>
  );
}
