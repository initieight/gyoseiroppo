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
  articleSortKey,
  articleHref,
  articleLabel,
} from '@/lib/laws';

export const dynamicParams = false;

export function generateStaticParams() {
  return LAWS.map(l => ({ lawId: l.id }));
}

type RankRow = {
  rank: number;
  key: string;
  href: string;
  title: string;
  caption?: string;
  count: number;
  years: string[];
  questions: string[];
};

async function buildRows(lawId: string): Promise<{ rows: RankRow[]; range: string }> {
  const [hl, lawData] = await Promise.all([getHighlightData(lawId), getLawData(lawId)]);

  const entries = Object.entries(hl.articles ?? {})
    .filter(([, v]) => (v?.count ?? 0) > 0)
    .map(([key, v]) => ({
      key,
      href: articleHref(lawId, key),
      title: lawData.articles?.[key]?.title ?? `第${key}条`,
      caption: lawData.articles?.[key]?.caption || undefined,
      count: v.count,
      years: v.years ?? [],
      questions: Array.from(new Set(v.questions ?? [])),
    }));

  entries.sort((a, b) =>
    b.count !== a.count ? b.count - a.count : articleSortKey(a.key) - articleSortKey(b.key),
  );

  const range = hl.range?.length
    ? `${hl.range[0]}〜${hl.range[hl.range.length - 1]}`
    : EXAM_RANGE;

  return { rows: entries.map((e, i) => ({ rank: i + 1, ...e })), range };
}

export async function generateMetadata({
  params,
}: {
  params: { lawId: string };
}): Promise<Metadata> {
  if (!isLawId(params.lawId)) return { title: 'ページが見つかりません' };
  const meta = lawMeta(params.lawId)!;
  const { rows, range } = await buildRows(params.lawId);

  const top = rows
    .slice(0, 3)
    .map(r => articleLabel(r.key) ?? r.title)
    .join('・');
  const title = `${meta.name} 出題ランキング｜行政書士試験の過去問${range}`;
  const description = rows.length
    ? `行政書士試験の過去問（${range}）で${meta.name}から出題された${rows.length}条を、出題回数の多い順にランキング表示。最頻出は${top}。条文本文と出題年度も確認できます。`
    : `行政書士試験の過去問（${range}）における${meta.name}の出題実績。現在集計対象の出題はありません。`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/ranking/${params.lawId}` },
    robots: rows.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: `/ranking/${params.lawId}` },
  };
}

export default async function RankingPage({ params }: { params: { lawId: string } }) {
  const { lawId } = params;
  if (!isLawId(lawId)) notFound();

  const meta = lawMeta(lawId)!;
  const { rows, range } = await buildRows(lawId);
  const totalCount = rows.reduce((s, r) => s + r.count, 0);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
      {/* パンくず */}
      <nav aria-label="パンくず" className="mb-4 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link href={`/law/${lawId}`} className="text-blue-600 hover:underline">{meta.name}</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">出題ランキング</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-800 mb-1">
        {meta.name} 出題ランキング（行政書士試験 {range}）
      </h1>
      <p className="text-sm text-gray-600 leading-6 mb-6">
        {rows.length > 0 ? (
          <>
            行政書士試験の過去問{range}から抽出した{meta.name}の根拠条文を、出題回数順に並べています。
            対象は{rows.length}条・のべ{totalCount}回。条文名をタップすると本文と出題箇所を確認できます。
          </>
        ) : (
          <>{range}の過去問では、{meta.name}を根拠条文とする出題を確認できていません。</>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="p-4 text-sm text-gray-600 border rounded-lg bg-gray-50">
          出題データがありません。
          <Link href={`/law/${lawId}`} className="ml-1 text-blue-600 hover:underline">
            {meta.name}の条文一覧を見る →
          </Link>
        </div>
      ) : (
        <ol className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {rows.map(r => (
            <li key={r.key}>
              <Link
                href={r.href}
                className="flex items-center gap-3 px-3 py-3 min-h-[56px] hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span
                  className={`shrink-0 w-9 text-center font-mono text-sm font-bold ${
                    r.rank === 1 ? 'text-yellow-500'
                    : r.rank === 2 ? 'text-gray-400'
                    : r.rank === 3 ? 'text-amber-600'
                    : 'text-gray-400'
                  }`}
                >
                  #{r.rank}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block">
                    <span className="font-semibold text-gray-800 text-sm">{r.title}</span>
                    {r.caption && <span className="ml-2 text-xs text-gray-500">{r.caption}</span>}
                  </span>
                  {r.questions.length > 0 && (
                    <span className="flex flex-wrap gap-1 mt-1">
                      {r.questions.slice(0, 6).map(q => (
                        <span key={q} className="px-1 py-0.5 text-[10px] rounded bg-purple-50 text-purple-600">
                          {q}
                        </span>
                      ))}
                    </span>
                  )}
                </span>

                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{r.count}回</span>
                  <span className="flex flex-wrap gap-1 justify-end max-w-[104px] sm:max-w-none">
                    {r.years.map(y => (
                      <span key={y} className="px-1 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium">
                        {y}
                      </span>
                    ))}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8">
        <Link
          href={`/law/${lawId}`}
          className="inline-flex items-center min-h-[48px] px-4 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← {meta.name} 条文一覧へ
        </Link>
      </div>

      {/* 他の法律のランキング */}
      <section className="mt-12 pt-6 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ほかの法律の出題ランキング</h2>
        <ul className="grid grid-cols-2 gap-2">
          {LAWS.filter(l => l.id !== lawId).map(l => (
            <li key={l.id}>
              <Link
                href={`/ranking/${l.id}`}
                className="block px-3 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
