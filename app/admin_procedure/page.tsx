'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface HighlightArticle {
  article: number
  years: string[]
  highlights: string[]
}

interface ExamItem {
  question: number
  choice: string
  isCorrect: boolean
  article: number
  phrase: string
}

interface ExamData {
  year: string
  lawId: string
  items: ExamItem[]
}

const YEARS = ['r2', 'r3', 'r4', 'r5', 'r6', 'r7'] as const;
const YEAR_LABELS: Record<string, string> = {
  r2: 'R2', r3: 'R3', r4: 'R4', r5: 'R5', r6: 'R6', r7: 'R7',
};

export default function AdminProcedurePage() {
  const [examData, setExamData] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(
      YEARS.map(y =>
        fetch(`/${y}_admin_procedure.json`, { cache: 'no-store' })
          .then(r => (r.ok ? (r.json() as Promise<ExamData>) : null))
          .catch(() => null)
      )
    )
      .then(results => setExamData(results.filter(Boolean) as ExamData[]))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const articles = useMemo<HighlightArticle[]>(() => {
    const map = new Map<number, { years: Set<string>; highlights: Set<string> }>();

    for (const data of examData) {
      for (const item of data.items) {
        if (!map.has(item.article)) {
          map.set(item.article, { years: new Set(), highlights: new Set() });
        }
        const entry = map.get(item.article)!;
        entry.years.add(YEAR_LABELS[data.year.toLowerCase()] ?? data.year);
        if (item.phrase) entry.highlights.add(item.phrase);
      }
    }

    return Array.from(map.entries())
      .map(([article, { years, highlights }]) => ({
        article,
        years: Array.from(years).sort(),
        highlights: Array.from(highlights),
      }))
      .sort((a, b) => a.article - b.article);
  }, [examData]);

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← トップへ
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">行政手続法 過去問まとめ</h1>
      <p className="text-xs text-gray-400 mb-6">
        R2〜R7 出題条文一覧（{articles.length} 条文）
      </p>

      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
        {articles.map(art => (
          <li key={art.article} className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-800">第{art.article}条</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {art.years.map(y => (
                  <span
                    key={y}
                    className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium"
                  >
                    {y}
                  </span>
                ))}
              </div>
            </div>
            {art.highlights.length > 0 && (
              <ul className="space-y-1 mt-2">
                {art.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="text-xs text-gray-600 border-l-2 border-blue-200 pl-2 leading-5"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
