import type { Metadata } from 'next';
import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';
import { LAWS, EXAM_RANGE, SITE_NAME, getLawData, getHighlightData } from '@/lib/laws';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function Home() {
  const stats = await Promise.all(
    LAWS.map(async law => {
      const [lawData, hl] = await Promise.all([getLawData(law.id), getHighlightData(law.id)]);
      const asked = Object.values(hl.articles ?? {}).filter(a => (a?.count ?? 0) > 0).length;
      return { ...law, total: Object.keys(lawData.articles).length, asked };
    }),
  );

  const totalArticles = stats.reduce((s, l) => s + l.total, 0);

  return (
    <main className="min-h-screen px-4 py-10 pb-16 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-3 leading-8">
          {SITE_NAME}｜過去問の出題条文がわかる無料Web六法
        </h1>
        <p className="text-sm text-gray-700 leading-7 mb-6">
          行政書士試験の過去問（{EXAM_RANGE}）から抽出した根拠条文を、条文本文と一緒に表示します。
          条文ごとに「何回・どの年度に出たか」が分かるので、条文集を頭から読むより出題箇所を優先して潰せます。
          {LAWS.length}法令・全{totalArticles.toLocaleString('ja-JP')}条を収録。登録不要・無料です。
        </p>

        <InstallPrompt />

        <h2 className="text-sm font-semibold text-gray-500 tracking-wide mb-3 mt-8">
          法律から条文を探す
        </h2>

        <ul className="space-y-2">
          {stats.map(law => (
            <li key={law.id}>
              <Link
                href={`/law/${law.id}`}
                className="flex items-center justify-between gap-3 px-4 py-4 min-h-[64px] rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-800">{law.name}</span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">
                    全{law.total}条 ／ {EXAM_RANGE}で{law.asked}条が出題
                  </span>
                </span>
                <span className="text-gray-400 text-xl shrink-0">›</span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="text-sm font-semibold text-gray-500 tracking-wide mb-3 mt-10">
          出題ランキングから探す
        </h2>
        <p className="text-xs text-gray-500 leading-6 mb-3">
          過去問{EXAM_RANGE}で出題回数の多かった条文順に並べたページです。
        </p>
        <ul className="grid grid-cols-2 gap-2">
          {LAWS.map(law => (
            <li key={law.id}>
              <Link
                href={`/ranking/${law.id}`}
                className="block px-3 py-3 min-h-[48px] rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {law.name}
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-12 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">このサイトについて</h2>
          <div className="text-xs text-gray-500 leading-6 space-y-2">
            <p>
              条文本文は e-Gov 法令検索の法令データをもとにしています。出題実績は行政書士試験の
              過去問（{EXAM_RANGE}）を独自に分析して根拠条文を割り当てたもので、公式の集計ではありません。
              集計方法上、取りこぼしや誤りが含まれる場合があります。最終確認は必ず一次情報（e-Gov・試験センター）
              で行ってください。
            </p>
            <p>β版のため、データとページは順次追加・修正しています。</p>
          </div>
        </section>
      </div>
    </main>
  );
}
