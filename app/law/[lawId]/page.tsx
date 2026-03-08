'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RankBadge, { getRank, type Rank } from '@/components/RankBadge';

interface LawArticle {
  title: string;
  caption?: string;
}

interface LawData {
  lawId: string;
  articles: Record<string, LawArticle>;
}

interface HighlightArticle {
  count: number;
  years: string[];
}

interface HighlightData {
  lawId: string;
  articles: Record<string, HighlightArticle>;
}

const LAW_NAMES: Record<string, string> = {
  constitution:       '憲法',
  civil_code:         '民法',
  commercial_code:    '商法',
  company_act:        '会社法',
  admin_procedure:    '行政手続法',
  admin_appeal:       '行政不服審査法',
  admin_litigation:   '行政事件訴訟法',
  state_liability:    '国家賠償法',
  admin_enforcement:  '行政代執行法',
  national_admin_org: '国家行政組織法',
  local_autonomy:     '地方自治法',
};

/** "36の2" → 36.2 のようにソートキーを作る */
function articleSortKey(key: string): number {
  const m = key.match(/^(\d+)(の(\d+))?/);
  if (!m) return 9999;
  return parseInt(m[1], 10) + (m[3] ? parseInt(m[3], 10) * 0.1 : 0);
}

/** 404 でも落ちない fetch。失敗時は fallback を返す */
async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    return r.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

const RANK_META: Record<Rank, { label: string; chipActive: string; chipInactive: string }> = {
  S: {
    label: 'S ＝ 3回以上',
    chipActive: 'bg-red-500 text-white border-red-500',
    chipInactive: 'bg-white text-red-500 border-red-400 hover:bg-red-50',
  },
  A: {
    label: 'A ＝ 2回',
    chipActive: 'bg-orange-400 text-white border-orange-400',
    chipInactive: 'bg-white text-orange-500 border-orange-400 hover:bg-orange-50',
  },
  B: {
    label: 'B ＝ 1回',
    chipActive: 'bg-yellow-300 text-gray-900 border-yellow-300',
    chipInactive: 'bg-white text-yellow-600 border-yellow-400 hover:bg-yellow-50',
  },
  C: {
    label: 'C ＝ 未出題',
    chipActive: 'bg-gray-400 text-white border-gray-400',
    chipInactive: 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50',
  },
};

const RANKS: Rank[] = ['S', 'A', 'B', 'C'];

type ArticleRow = {
  key: string;
  title: string;
  caption?: string;
  count: number;
  years: string[];
  rank: Rank;
};

export default function LawListPage() {
  const params = useParams();
  const lawId = (params.lawId as string) ?? '';

  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Rank | null>(null);

  useEffect(() => {
    if (!lawId) return;

    const emptyHl: HighlightData = { lawId, articles: {} };

    Promise.all([
      fetch(`/laws/${lawId}.json`, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error(`laws/${lawId}.json が見つかりません (${r.status})`);
        return r.json() as Promise<LawData>;
      }),
      fetchJson<HighlightData>(`/highlights/r2_r7_${lawId}.json`, emptyHl),
    ])
      .then(([lawData, hlData]) => {
        const merged: ArticleRow[] = Object.entries(lawData.articles)
          .map(([key, art]) => {
            const count = hlData.articles?.[key]?.count ?? 0;
            return {
              key,
              title: art.title,
              caption: art.caption,
              count,
              years: hlData.articles?.[key]?.years ?? [],
              rank: getRank(count),
            };
          })
          .sort((a, b) => articleSortKey(a.key) - articleSortKey(b.key));
        setArticles(merged);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [lawId]);

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const lawName = LAW_NAMES[lawId] ?? lawId;
  const displayed = filter ? articles.filter(a => a.rank === filter) : articles;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* ヘッダ */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← トップへ
        </Link>
        <Link href={`/ranking/${lawId}`} className="text-sm text-blue-600 hover:underline">
          出題ランキング →
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">{lawName}</h1>
      <p className="text-xs text-gray-400 mb-4">
        条文一覧 — R2〜R7 出題実績付き（全{articles.length}条）
      </p>

      {/* 凡例 */}
      <div className="text-xs text-gray-500 mb-3 leading-5">
        {RANKS.map((r, i) => (
          <span key={r}>
            <span className={`inline-block font-bold px-1 rounded ${r === 'S' ? 'bg-red-500 text-white' : r === 'A' ? 'bg-orange-400 text-white' : r === 'B' ? 'bg-yellow-300 text-gray-900' : 'bg-gray-200 text-gray-600'}`}>{r}</span>
            {' '}{RANK_META[r].label.split('＝')[1].trim()}
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
              onClick={() => setFilter(isActive ? null : r)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                isActive ? RANK_META[r].chipActive : RANK_META[r].chipInactive
              }`}
            >
              {r}　{RANK_META[r].label.split('＝')[1].trim()}
              {isActive && ' ✕'}
            </button>
          );
        })}
        {filter && (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="px-3 py-1 text-xs text-gray-400 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
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
              href={`/law/${lawId}/${art.key}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              {/* 左: 条文名 + caption */}
              <div className="flex items-center gap-3 min-w-0">
                <RankBadge rank={art.rank} />
                <div className="min-w-0">
                  <span className="font-semibold text-gray-800 text-sm">{art.title}</span>
                  {art.caption && (
                    <span className="ml-2 text-xs text-gray-500">{art.caption}</span>
                  )}
                </div>
              </div>

              {/* 右: 出題回数 + 年度タグ */}
              <div className="flex items-center gap-2 shrink-0 text-right">
                {art.count > 0 ? (
                  <>
                    <span className="text-sm font-bold text-gray-700">{art.count}回</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {art.years.map(y => (
                        <span
                          key={y}
                          className="px-1 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium"
                        >
                          {y}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-gray-300">未出題</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
