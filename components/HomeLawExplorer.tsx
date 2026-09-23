'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';

export type HomeLawStat = {
  id: string;
  name: string;
  shortDesc: string;
  total: number;
  asked: number;
};

type FeaturedArticle = {
  lawName: string;
  articleLabel: string;
  caption: string;
  excerpt: string;
  count: string;
  years: string[];
  href: string;
};

const badgeTones: Record<string, string> = {
  constitution: 'bg-rose-50 text-rose-700',
  admin_procedure: 'bg-amber-50 text-amber-700',
  admin_appeal: 'bg-sky-50 text-sky-700',
  admin_litigation: 'bg-violet-50 text-violet-700',
  state_liability: 'bg-emerald-50 text-emerald-700',
  admin_enforcement: 'bg-orange-50 text-orange-700',
  national_admin_org: 'bg-cyan-50 text-cyan-700',
  local_autonomy: 'bg-lime-50 text-lime-700',
  civil_code: 'bg-blue-50 text-blue-700',
  commercial_code: 'bg-fuchsia-50 text-fuchsia-700',
  company_act: 'bg-teal-50 text-teal-700',
};

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function BookIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
    </svg>
  );
}

export default function HomeLawExplorer({
  stats,
  totalArticles,
  examRange,
  featured,
}: {
  stats: HomeLawStat[];
  totalArticles: number;
  examRange: string;
  featured?: FeaturedArticle;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('ja-JP');
  const filteredLaws = useMemo(
    () => stats.filter(law => `${law.name} ${law.shortDesc}`.toLocaleLowerCase('ja-JP').includes(normalizedQuery)),
    [normalizedQuery, stats],
  );

  const showResults = () => {
    document.getElementById('laws')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#214a72]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2d74ad]" aria-hidden />
              行政書士試験 {examRange} に対応
            </div>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.17] tracking-tight text-[#14243b] sm:text-5xl lg:text-[3.25rem]">
              <span className="block">過去問の出題条文が、</span>
              <span className="block">
                <span className="text-[#2d74ad]">すぐにわかる</span>
                <span className="block sm:inline">無料Web六法</span>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
              行政書士試験の過去問から根拠条文を抽出。条文本文と一緒に、何問・どの年度に出たかを確認できます。
            </p>

            <form
              className="mt-8 flex max-w-xl items-center rounded-2xl border border-slate-300 bg-white p-1.5 shadow-sm focus-within:border-[#2d74ad] focus-within:ring-4 focus-within:ring-blue-100"
              onSubmit={event => {
                event.preventDefault();
                showResults();
              }}
              role="search"
            >
              <SearchIcon className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
              <label htmlFor="law-search" className="sr-only">法律名や分野から検索</label>
              <input
                id="law-search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="法律名・分野で検索（例：民法、取消訴訟）"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400"
              />
              <button type="submit" className="rounded-xl bg-[#214a72] px-4 py-3 text-sm font-semibold text-white hover:bg-[#173753]">
                検索
              </button>
            </form>
            <p className="mt-4 text-xs text-slate-500">
              登録不要・無料　/　{stats.length}法令・全{totalArticles.toLocaleString('ja-JP')}条を収録
            </p>
            <InstallPrompt />
          </div>

          <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[2rem] bg-[#edf4fa] p-7 sm:p-10">
            <div className="absolute -right-14 -top-20 h-60 w-60 rounded-full bg-[#d8e8f5]" />
            <div className="absolute -bottom-24 -left-14 h-56 w-56 rounded-full bg-[#dfeeee]" />
            {featured && (
              <Link
                href={featured.href}
                className="group relative w-full max-w-sm rounded-2xl border border-white bg-white p-6 shadow-xl shadow-blue-950/10 transition-transform hover:-translate-y-1"
              >
                <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold tracking-[0.18em] text-[#214a72]">{featured.lawName}</span>
                  <BookIcon className="h-5 w-5 text-[#2d74ad]" />
                </div>
                <p className="text-[11px] font-semibold text-slate-400">{featured.articleLabel}</p>
                <h2 className="mt-1 text-base font-bold text-slate-800">{featured.caption}</h2>
                <div className="mt-4 rounded-xl bg-blue-50 p-4">
                  <p className="text-xs leading-6 text-slate-600">{featured.excerpt}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                    出題 {featured.count}
                  </span>
                  {featured.years.length > 0 && (
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                      {featured.years.join('・')}
                    </span>
                  )}
                  <span className="ml-auto text-sm text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#2d74ad]" aria-hidden>
                    →
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section id="laws" className="scroll-mt-6 mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="mb-8 flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#2d74ad]">LAWS</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl">法律から条文を探す</h2>
          </div>
          <span className="hidden text-sm text-slate-500 sm:block">
            {query ? `${filteredLaws.length}件を表示` : `${stats.length}法令 / ${totalArticles.toLocaleString('ja-JP')}条`}
          </span>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {filteredLaws.map(law => (
            <li key={law.id}>
              <Link
                href={`/law/${law.id}`}
                className="group flex h-full min-h-[144px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#9fc5e3] hover:shadow-md"
              >
                <span className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block font-bold text-slate-800 group-hover:text-[#214a72]">{law.name}</span>
                    <span className="mt-1.5 block text-xs leading-5 text-slate-500">{law.shortDesc}</span>
                  </span>
                  <span className="text-lg text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#2d74ad]" aria-hidden>
                    ›
                  </span>
                </span>
                <span className="mt-5 flex items-center justify-between gap-3">
                  <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${badgeTones[law.id] ?? 'bg-slate-100 text-slate-600'}`}>
                    出題 {law.asked}条
                  </span>
                  <span className="text-[11px] text-slate-400">全{law.total.toLocaleString('ja-JP')}条</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {filteredLaws.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">該当する法律が見つかりませんでした</p>
            <p className="mt-2 text-xs text-slate-500">法律名または分野を変えて検索してください。</p>
            <button type="button" onClick={() => setQuery('')} className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[#214a72] hover:bg-slate-50">
              検索を解除
            </button>
          </div>
        )}
      </section>
    </>
  );
}
