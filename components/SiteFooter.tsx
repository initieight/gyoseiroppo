import Link from 'next/link';
import { SITE_NAME } from '@/lib/laws';

/** 全ページ共通のフッター。/about への導線をサイト全体から張るために置く */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white px-5 py-9 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#214a72] text-[10px] font-bold text-white" aria-hidden>
            六法
          </span>
          <span className="font-bold tracking-tight text-[#214a72]">{SITE_NAME}</span>
        </div>
        <nav aria-label="フッター" className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/" className="text-slate-600 hover:text-[#214a72] hover:underline">
            トップ
          </Link>
          <Link href="/law" className="text-slate-600 hover:text-[#214a72] hover:underline">
            法律一覧
          </Link>
          <Link href="/column/minpo" className="text-slate-600 hover:text-[#214a72] hover:underline">
            民法の攻略
          </Link>
          <Link href="/kouza/gyosei" className="text-slate-600 hover:text-[#214a72] hover:underline">
            通信講座の比較
          </Link>
          <Link href="/about" className="text-slate-600 hover:text-[#214a72] hover:underline">
            このサイトについて
          </Link>
        </nav>
        <p className="max-w-3xl text-[11px] leading-5 text-slate-500">
          {SITE_NAME}は行政書士試験の受験生向けの学習情報サイトです。
          行政書士業務としての法律相談・書類作成の依頼は受け付けていません。
          条文は法令改正により変わります。最終確認は e-Gov 法令検索でお願いします。
        </p>
      </div>
    </footer>
  );
}
