import type { Metadata } from 'next';
import Link from 'next/link';
import HomeLawExplorer, { type HomeLawStat } from '@/components/HomeLawExplorer';
import KouzaNudge from '@/components/kouza/KouzaNudge';
import {
  LAWS,
  EXAM_RANGE,
  SITE_NAME,
  articleHref,
  articleLabel,
  articleSortKey,
  countLabel,
  getHighlightData,
  getLawData,
} from '@/lib/laws';
import { DATA_SOURCE_TEXT } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

type RankingRow = {
  lawId: string;
  lawName: string;
  article: string;
  title: string;
  caption?: string;
  count: number;
  correctCount: number;
  choices: number;
  years: string[];
};

export default async function Home() {
  const datasets = await Promise.all(
    LAWS.map(async law => {
      const [lawData, highlights] = await Promise.all([
        getLawData(law.id),
        getHighlightData(law.id),
      ]);
      const asked = Object.values(highlights.articles ?? {}).filter(article => (article?.count ?? 0) > 0).length;
      return { law, lawData, highlights, asked };
    }),
  );

  const stats: HomeLawStat[] = datasets.map(({ law, lawData, asked }) => ({
    id: law.id,
    name: law.name,
    shortDesc: law.shortDesc,
    total: Object.keys(lawData.articles).length,
    asked,
  }));
  const totalArticles = stats.reduce((sum, law) => sum + law.total, 0);

  const rankingRows: RankingRow[] = datasets
    .flatMap(({ law, lawData, highlights }) =>
      Object.entries(highlights.articles ?? {})
        .filter(([, item]) => (item?.count ?? 0) > 0)
        .map(([article, item]) => ({
          lawId: law.id,
          lawName: law.name,
          article,
          title: lawData.articles[article]?.title ?? articleLabel(article) ?? `第${article}条`,
          caption: lawData.articles[article]?.caption || undefined,
          count: item.count,
          correctCount: item.correctCount ?? 0,
          choices: item.choices ?? 0,
          years: item.years ?? [],
        })),
    )
    .sort((a, b) =>
      b.count - a.count ||
      b.correctCount - a.correctCount ||
      b.choices - a.choices ||
      LAWS.findIndex(law => law.id === a.lawId) - LAWS.findIndex(law => law.id === b.lawId) ||
      articleSortKey(a.article) - articleSortKey(b.article),
    );

  const civilDataset = datasets.find(({ law }) => law.id === 'civil_code');
  const featuredArticleKey = civilDataset?.lawData.articles['709'] ? '709' : rankingRows[0]?.article;
  const featuredLawId = civilDataset?.lawData.articles['709'] ? 'civil_code' : rankingRows[0]?.lawId;
  const featuredDataset = datasets.find(({ law }) => law.id === featuredLawId);
  const featuredArticle = featuredArticleKey && featuredDataset
    ? featuredDataset.lawData.articles[featuredArticleKey]
    : undefined;
  const featuredHighlight = featuredArticleKey && featuredDataset
    ? featuredDataset.highlights.articles[featuredArticleKey]
    : undefined;

  const featured = featuredArticle && featuredArticleKey && featuredDataset
    ? {
        lawName: featuredDataset.law.name,
        articleLabel: articleLabel(featuredArticleKey) ?? featuredArticle.title,
        caption: featuredArticle.caption || featuredArticle.title,
        excerpt: `${featuredArticle.text.replace(/\s+/g, ' ').slice(0, 76)}${featuredArticle.text.length > 76 ? '…' : ''}`,
        count: countLabel(featuredDataset.law.id, featuredHighlight?.count ?? 0),
        years: featuredHighlight?.years ?? [],
        href: articleHref(featuredDataset.law.id, featuredArticleKey),
      }
    : undefined;

  return (
    <main className="min-h-screen bg-[#f5f7f9] text-[#172033]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label={`${SITE_NAME} トップ`}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#214a72] text-sm font-bold tracking-tight text-white shadow-sm">
              六法
            </span>
            <span className="text-base font-bold tracking-tight text-[#214a72]">{SITE_NAME}</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:gap-2" aria-label="メインナビゲーション">
            <Link href="/law" className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-[#214a72]">
              法律一覧
            </Link>
            <Link href="/ranking/civil_code" className="hidden rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-[#214a72] sm:block">
              出題ランキング
            </Link>
            <Link href="/about" className="hidden rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-[#214a72] md:block">
              このサイトについて
            </Link>
          </nav>
        </div>
      </header>

      <HomeLawExplorer
        stats={stats}
        totalArticles={totalArticles}
        examRange={EXAM_RANGE}
        featured={featured}
      />

      <section id="ranking" className="scroll-mt-6 border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#2d74ad]">RANKING</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl">
              出題ランキングから探す
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              行政書士試験の過去問{EXAM_RANGE}で、根拠条文になった問題数が多い条文を表示しています。
              法令ごとの全順位では、出題年度や問題番号まで確認できます。
            </p>
            <Link
              href="/ranking/civil_code"
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#214a72] hover:text-[#173753]"
            >
              民法のランキングを見る
              <span aria-hidden>→</span>
            </Link>
          </div>

          <ol className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcfe] px-5 shadow-sm">
            {rankingRows.slice(0, 5).map((row, index) => (
              <li key={`${row.lawId}-${row.article}`}>
                <Link
                  href={articleHref(row.lawId, row.article)}
                  className="group flex min-h-[76px] items-center gap-4 py-4"
                >
                  <span className="w-7 shrink-0 text-center font-mono text-sm font-bold text-[#2d74ad]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium text-slate-500">
                      {row.lawName}　{articleLabel(row.article) ?? row.article}
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-slate-800 group-hover:text-[#214a72]">
                      {row.caption || row.title}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right sm:block">
                    <span className="block text-xs font-bold text-[#214a72]">{countLabel(row.lawId, row.count)}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{row.years.join('・')}</span>
                  </span>
                  <span className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#2d74ad]" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="about" className="scroll-mt-6 mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="overflow-hidden rounded-3xl bg-[#214a72] px-6 py-10 text-white shadow-lg shadow-blue-950/10 sm:px-10 lg:px-12">
          <div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-blue-200">ABOUT ROPPŌ</p>
              <h2 className="mt-3 text-2xl font-bold">条文を、試験対策の味方に。</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100">
                {DATA_SOURCE_TEXT}
              </p>
              <Link
                href="/about"
                className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10"
              >
                サイトの目的・集計方法を見る
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-center">
                <p className="text-3xl font-bold">{LAWS.length}</p>
                <p className="mt-1 text-xs text-blue-100">収録法令</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-center">
                <p className="text-3xl font-bold">{totalArticles.toLocaleString('ja-JP')}</p>
                <p className="mt-1 text-xs text-blue-100">収録条文</p>
              </div>
            </div>
          </div>
        </div>

        <KouzaNudge />
      </section>
    </main>
  );
}
