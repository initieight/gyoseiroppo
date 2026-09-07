'use client';

import { useState } from 'react';
import Link from 'next/link';
import RankBadge, { type Rank } from '@/components/RankBadge';

export type ArticleRow = {
  key: string;
  href: string;
  title: string;
  caption?: string;
  count: number;
  years: string[];
  rank: Rank;
};

const RANK_META: Record<Rank, { label: string; chipActive: string; chipInactive: string }> = {
  S: {
    label: '3回以上',
    chipActive: 'bg-red-500 text-white border-red-500',
    chipInactive: 'bg-white text-red-500 border-red-400 hover:bg-red-50',
  },
  A: {
    label: '2回',
    chipActive: 'bg-orange-400 text-white border-orange-400',
    chipInactive: 'bg-white text-orange-500 border-orange-400 hover:bg-orange-50',
  },
  B: {
    label: '1回',
    chipActive: 'bg-yellow-300 text-gray-900 border-yellow-300',
    chipInactive: 'bg-white text-yellow-600 border-yellow-400 hover:bg-yellow-50',
  },
  C: {
    label: '未出題',
    chipActive: 'bg-gray-400 text-white border-gray-400',
    chipInactive: 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50',
  },
};

const RANKS: Rank[] = ['S', 'A', 'B', 'C'];

export default function LawListClient({ articles }: { articles: ArticleRow[] }) {
  const [filter, setFilter] = useState<Rank | null>(null);
  const displayed = filter ? articles.filter(a => a.rank === filter) : articles;

  return (
    <>
      {/* 凡例 */}
      <div className="text-xs text-gray-500 mb-3 leading-6">
        {RANKS.map((r, i) => (
          <span key={r}>
            <span
              className={`inline-block font-bold px-1 rounded ${
                r === 'S' ? 'bg-red-500 text-white'
                : r === 'A' ? 'bg-orange-400 text-white'
                : r === 'B' ? 'bg-yellow-300 text-gray-900'
                : 'bg-gray-200 text-gray-600'
              }`}
            >
              {r}
            </span>{' '}
            {RANK_META[r].label}
            {i < RANKS.length - 1 && <span className="mx-2 text-gray-300">／</span>}
          </span>
        ))}
        <span className="ml-2 text-gray-400">（R2〜R7）</span>
      </div>

      {/* フィルタチップ */}
      <div className="flex flex-wrap gap-2 mb-6">
        {RANKS.map(r => {
          const isActive = filter === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(isActive ? null : r)}
              className={`min-h-[44px] px-4 py-2 text-xs font-semibold rounded-full border transition-colors ${
                isActive ? RANK_META[r].chipActive : RANK_META[r].chipInactive
              }`}
            >
              {r}　{RANK_META[r].label}
              {isActive && ' ✕'}
            </button>
          );
        })}
        {filter && (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="min-h-[44px] px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
          >
            すべて表示
          </button>
        )}
      </div>

      {/* 件数 */}
      <p className="text-xs text-gray-400 mb-3">
        {displayed.length} 件{filter ? `（ランク ${filter} でフィルタ中）` : ''}
      </p>

      {/* 条文一覧 */}
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {displayed.map(art => (
          <li key={art.key}>
            <Link
              href={art.href}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 min-h-[56px] hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              {/* 左: 条文名 + caption */}
              <span className="flex items-center gap-3 min-w-0 flex-1">
                <RankBadge rank={art.rank} />
                <span className="min-w-0">
                  <span className="font-semibold text-gray-800 text-sm">{art.title}</span>
                  {art.caption && (
                    <span className="ml-2 text-xs text-gray-500">{art.caption}</span>
                  )}
                </span>
              </span>

              {/* 右: 出題回数 + 年度タグ */}
              <span className="flex items-center gap-2 shrink-0">
                {art.count > 0 ? (
                  <>
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                      {art.count}回
                    </span>
                    <span className="flex flex-wrap gap-1 justify-end max-w-[104px] sm:max-w-none">
                      {art.years.map(y => (
                        <span
                          key={y}
                          className="px-1 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium"
                        >
                          {y}
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-300">未出題</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
