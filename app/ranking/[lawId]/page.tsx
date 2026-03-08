'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
  range: string[];
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

type RankRow = {
  rank: number;
  key: string;         // article key ("2", "36" etc.)
  title: string;       // 第◯条
  caption?: string;
  count: number;
  years: string[];
};

export default function RankingPage() {
  const params = useParams();
  const lawId = (params.lawId as string) ?? '';

  const [hlData, setHlData] = useState<HighlightData | null>(null);
  const [lawData, setLawData] = useState<LawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lawId) return;

    const emptyHl: HighlightData = { lawId, range: [], articles: {} };
    const emptyLaw: LawData = { lawId, articles: {} };

    Promise.all([
      fetchJson<HighlightData>(`/highlights/r2_r7_${lawId}.json`, emptyHl),
      fetchJson<LawData>(`/laws/${lawId}.json`, emptyLaw),
    ])
      .then(([hl, law]) => {
        setHlData(hl);
        setLawData(law);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [lawId]);

  const rows: RankRow[] = useMemo(() => {
    if (!hlData) return [];

    const entries = Object.entries(hlData.articles ?? {})
      .filter(([, v]) => (v?.count ?? 0) > 0)
      .map(([key, v]) => ({
        key,
        title: lawData?.articles?.[key]?.title ?? `第${key}条`,
        caption: lawData?.articles?.[key]?.caption,
        count: v.count,
        years: v.years ?? [],
      }));

    // count 降順 → 同率は条番号昇順（数値として比較）
    entries.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return parseInt(a.key, 10) - parseInt(b.key, 10);
    });

    return entries.map((e, i) => ({ rank: i + 1, ...e }));
  }, [hlData, lawData]);

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  const lawName = LAW_NAMES[lawId] ?? lawId;
  const rangeLabel = hlData?.range?.length
    ? `${hlData.range[0]}〜${hlData.range[hlData.range.length - 1]}`
    : '';

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* ヘッダ */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href={`/law/${lawId}`} className="text-sm text-blue-600 hover:underline">
          ← 条文一覧へ
        </Link>
        <Link href="/law" className="text-sm text-blue-600 hover:underline">
          法律選択へ
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-0.5">{lawName} 出題ランキング</h1>
      {rangeLabel && (
        <p className="text-xs text-gray-400 mb-6">{rangeLabel} 出題実績</p>
      )}

      {rows.length === 0 ? (
        <div className="p-4 text-gray-500 border rounded-lg">出題データがありません</div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {rows.map(r => (
            <li key={r.key}>
              <Link
                href={`/law/${lawId}/${r.key}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* 順位バッジ */}
                <span className={`shrink-0 w-9 text-center font-mono text-sm font-bold ${
                  r.rank === 1 ? 'text-yellow-500' :
                  r.rank === 2 ? 'text-gray-400' :
                  r.rank === 3 ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  #{r.rank}
                </span>

                {/* 条文名 */}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-800 text-sm">{r.title}</span>
                  {r.caption && (
                    <span className="ml-2 text-xs text-gray-500">{r.caption}</span>
                  )}
                </div>

                {/* 出題回数 + 年度タグ */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-gray-700">{r.count}回</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {r.years.map(y => (
                      <span
                        key={y}
                        className="px-1 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium"
                      >
                        {y}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
