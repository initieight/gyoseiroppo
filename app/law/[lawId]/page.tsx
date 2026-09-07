import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  LAWS,
  EXAM_RANGE,
  isLawId,
  lawMeta,
  getLawData,
  getHighlightData,
  sortedArticleKeys,
  articleHref,
} from '@/lib/laws';
import { getRank } from '@/components/RankBadge';
import LawListClient, { type ArticleRow } from './LawListClient';
import KouzaNudge from '@/components/kouza/KouzaNudge';

export const dynamicParams = false;

export function generateStaticParams() {
  return LAWS.map(l => ({ lawId: l.id }));
}

export async function generateMetadata({
  params,
}: {
  params: { lawId: string };
}): Promise<Metadata> {
  if (!isLawId(params.lawId)) return { title: 'ページが見つかりません' };
  const meta = lawMeta(params.lawId)!;
  const hl = await getHighlightData(params.lawId);
  const asked = Object.values(hl.articles ?? {}).filter(a => (a?.count ?? 0) > 0).length;

  return {
    title: { absolute: `${meta.name} 全条文一覧｜行政書士試験の出題回数つき` },
    description:
      `${meta.name}の全条文を、行政書士試験（${EXAM_RANGE}）の出題回数・出題年度つきで一覧表示。` +
      `過去6年で${asked}条が出題されています。${meta.shortDesc}。`,
    alternates: { canonical: `/law/${params.lawId}` },
    openGraph: {
      title: `${meta.name} 条文一覧｜行政書士試験の出題実績つき`,
      description: `${meta.name}の全条文を行政書士試験（${EXAM_RANGE}）の出題回数つきで一覧表示。`,
      url: `/law/${params.lawId}`,
    },
  };
}

export default async function LawListPage({ params }: { params: { lawId: string } }) {
  const { lawId } = params;
  if (!isLawId(lawId)) notFound();

  const meta = lawMeta(lawId)!;
  const [lawData, hl] = await Promise.all([getLawData(lawId), getHighlightData(lawId)]);

  const keys = sortedArticleKeys(lawData);
  if (keys.length === 0) notFound();

  const articles: ArticleRow[] = keys.map(key => {
    const art = lawData.articles[key];
    const count = hl.articles?.[key]?.count ?? 0;
    return {
      key,
      href: articleHref(lawId, key),
      title: art.title,
      caption: art.caption || undefined,
      count,
      years: hl.articles?.[key]?.years ?? [],
      rank: getRank(count),
    };
  });

  const askedCount = articles.filter(a => a.count > 0).length;
  const hasRanking = askedCount > 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* パンくず */}
      <nav aria-label="パンくず" className="mb-5 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link href="/law" className="text-blue-600 hover:underline">法律一覧</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">{meta.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        {meta.name} 条文一覧
      </h1>
      <p className="text-sm text-gray-600 leading-6 mb-1">{meta.shortDesc}</p>
      <p className="text-xs text-gray-400 mb-5">
        全{articles.length}条 ／ {EXAM_RANGE} で {askedCount}条が出題
      </p>

      {hasRanking && (
        <Link
          href={`/ranking/${lawId}`}
          className="mb-6 flex items-center justify-between gap-3 px-4 py-3 min-h-[52px] rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
        >
          <span>{meta.name} 出題ランキングを見る</span>
          <span className="text-blue-400 text-lg shrink-0">›</span>
        </Link>
      )}

      <LawListClient articles={articles} />

      {/* 他の法律へ */}
      <section className="mt-12 pt-6 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ほかの法律</h2>
        <ul className="grid grid-cols-2 gap-2">
          {LAWS.filter(l => l.id !== lawId).map(l => (
            <li key={l.id}>
              <Link
                href={`/law/${l.id}`}
                className="block px-3 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <KouzaNudge />
    </main>
  );
}
