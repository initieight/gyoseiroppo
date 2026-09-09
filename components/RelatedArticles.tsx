import Link from 'next/link';
import { articleHref, articleLabel, type RelatedArticle, type LawArticle } from '@/lib/laws';

/**
 * 同じ問題で一緒に根拠条文になった条文へのリンク。
 * 出題データからの機械的な共起で、論点の近さを保証するものではない。
 */
export default function RelatedArticles({
  lawId,
  items,
  articles,
}: {
  lawId: string;
  items: RelatedArticle[] | undefined;
  articles: Record<string, LawArticle>;
}) {
  const rows = (items ?? []).filter(r => articles[r.article]);
  if (rows.length === 0) return null;

  return (
    <section className="mt-10 border-t border-gray-100 pt-6">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">
        同じ問題で一緒に問われた条文
      </h2>
      <p className="mb-3 text-[11px] leading-5 text-gray-500">
        過去問1問の中で、この条文と同時に根拠になった条文です。出題データからの集計で、
        条文どうしの法的な関連を示すものではありません。
      </p>
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
        {rows.map(r => {
          const a = articles[r.article];
          return (
            <li key={r.article}>
              <Link
                href={articleHref(lawId, r.article)}
                className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100"
              >
                <span className="min-w-0">
                  <span className="text-sm font-semibold text-gray-800">
                    {articleLabel(r.article) ?? a.title}
                  </span>
                  {a.caption && <span className="ml-2 text-xs text-gray-500">{a.caption}</span>}
                </span>
                <span className="shrink-0 text-xs text-gray-400">同時{r.count}回</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
