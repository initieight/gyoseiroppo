import Link from 'next/link';
import type { Metadata } from 'next';
import { LAWS } from '@/lib/laws';

export const metadata: Metadata = {
  title: 'ページが見つかりません',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <p className="text-sm font-semibold text-blue-600 mb-2">404</p>
      <h1 className="text-2xl font-bold text-gray-800 mb-3">
        ページが見つかりません
      </h1>
      <p className="text-sm text-gray-600 leading-7 mb-8">
        お探しのページは削除されたか、URLが変更された可能性があります。
        <br />
        下の一覧から目的の法律を選び直してください。
      </p>

      <h2 className="text-sm font-semibold text-gray-500 mb-3">法律から探す</h2>
      <ul className="grid grid-cols-2 gap-2 mb-8">
        {LAWS.map(law => (
          <li key={law.id}>
            <Link
              href={`/law/${law.id}`}
              className="block px-3 py-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              {law.name}
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← トップへ戻る
      </Link>
    </main>
  );
}
