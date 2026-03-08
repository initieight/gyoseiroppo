import Link from 'next/link';

// 将来ここに法律を追加すると /law/[lawId] に自動対応する
const LAWS = [
  {
    id: 'admin_procedure',
    name: '行政手続法',
    description: '申請・不利益処分・行政指導・届出の手続き（R2〜R7）',
  },
] as const;

export default function LawIndexPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← トップへ
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">法律を選ぶ</h1>
      <p className="text-xs text-gray-400 mb-6">学習する法律を選んでください</p>

      <ul className="space-y-3">
        {LAWS.map(law => (
          <li key={law.id}>
            <Link
              href={`/law/${law.id}`}
              className="flex items-center justify-between gap-3 px-5 py-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-semibold text-gray-800">{law.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{law.description}</div>
              </div>
              <span className="text-gray-400 text-lg shrink-0">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
