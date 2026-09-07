import Link from 'next/link';

/**
 * 条文ページ・ランキングページの最下部に置く、講座比較ページへの内部導線。
 *
 * 置き場所のルール:
 *   条文本文の直上・直下には置かない。学習の邪魔になるため、
 *   前後条文ナビや一覧リンクより下、ページ末尾に置くこと。
 * リンク先はサイト内ページなので、この要素自体は広告ではない。
 * 広告表記は遷移先の /kouza/* 側のファーストビューで行う。
 */
export default function KouzaNudge({
  variant = 'default',
}: {
  /** 'article' は条文ページ用の、より小さい見た目 */
  variant?: 'default' | 'article';
}) {
  if (variant === 'article') {
    return (
      <div className="mt-10 border-t border-gray-100 pt-5">
        <Link
          href="/kouza/gyosei"
          className="block text-xs leading-6 text-gray-500 underline decoration-gray-300 underline-offset-4 hover:text-gray-700"
        >
          独学で行き詰まったら：行政書士通信講座4社を条文学習との相性で比較する
        </Link>
      </div>
    );
  }

  return (
    <section className="mt-12 border-t border-gray-100 pt-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-500">学習の進め方に迷ったら</h2>
      <Link
        href="/kouza/gyosei"
        className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-800">
            行政書士通信講座4社を条文学習との相性で比較
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-gray-500">
            価格・質問サポート・合格特典・合格実績の公表状況を公式情報で整理しています
          </span>
        </span>
        <span className="shrink-0 text-lg text-gray-400">›</span>
      </Link>
    </section>
  );
}
