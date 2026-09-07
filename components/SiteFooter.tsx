import Link from 'next/link';
import { SITE_NAME } from '@/lib/laws';

/** 全ページ共通のフッター。/about への導線をサイト全体から張るために置く */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <nav aria-label="フッター" className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900 hover:underline">
            トップ
          </Link>
          <Link href="/law" className="text-gray-600 hover:text-gray-900 hover:underline">
            法律一覧
          </Link>
          <Link href="/kouza/gyosei" className="text-gray-600 hover:text-gray-900 hover:underline">
            通信講座の比較
          </Link>
          <Link href="/about" className="text-gray-600 hover:text-gray-900 hover:underline">
            このサイトについて
          </Link>
        </nav>
        <p className="text-[11px] leading-5 text-gray-500">
          {SITE_NAME}は行政書士試験の受験生向けの学習情報サイトです。
          行政書士業務としての法律相談・書類作成の依頼は受け付けていません。
          条文は法令改正により変わります。最終確認は e-Gov 法令検索でお願いします。
        </p>
      </div>
    </footer>
  );
}
