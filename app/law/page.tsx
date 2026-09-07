import type { Metadata } from 'next';
import Link from 'next/link';
import { LAWS, EXAM_RANGE, getLawData, getHighlightData } from '@/lib/laws';

export const metadata: Metadata = {
  title: '法律一覧｜行政書士試験の出題条文がわかるWeb六法',
  description:
    `憲法・行政手続法・行政不服審査法・行政事件訴訟法・国家賠償法・行政代執行法・国家行政組織法・地方自治法・民法・商法・会社法の全条文を、` +
    `行政書士試験（${EXAM_RANGE}）の出題回数つきで確認できます。`,
  alternates: { canonical: '/law' },
};

export default async function LawIndexPage() {
  const stats = await Promise.all(
    LAWS.map(async law => {
      const [lawData, hl] = await Promise.all([getLawData(law.id), getHighlightData(law.id)]);
      const asked = Object.values(hl.articles ?? {}).filter(a => (a?.count ?? 0) > 0).length;
      return {
        ...law,
        total: Object.keys(lawData.articles).length,
        asked,
      };
    }),
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
      <nav aria-label="パンくず" className="mb-5 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">法律一覧</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">法律一覧</h1>
      <p className="text-sm text-gray-600 leading-6 mb-8">
        行政書士試験の出題範囲となる{LAWS.length}法令の条文を収録しています。
        各条文には過去問（{EXAM_RANGE}）の出題回数と出題年度がついています。
      </p>

      <ul className="space-y-3">
        {stats.map(law => (
          <li key={law.id}>
            <Link
              href={`/law/${law.id}`}
              className="flex items-center justify-between gap-3 px-4 py-4 min-h-[64px] rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-gray-800">{law.name}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{law.shortDesc}</span>
                <span className="block text-[11px] text-gray-400 mt-1">
                  全{law.total}条 ／ {EXAM_RANGE}で{law.asked}条が出題
                </span>
              </span>
              <span className="text-gray-400 text-lg shrink-0">›</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12 pt-6 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">出題ランキングから探す</h2>
        <ul className="grid grid-cols-2 gap-2">
          {LAWS.map(law => (
            <li key={law.id}>
              <Link
                href={`/ranking/${law.id}`}
                className="block px-3 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {law.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
