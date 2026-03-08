import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';

const LAWS = [
  { id: 'constitution',       name: '憲法',            href: '/law/constitution' },
  { id: 'admin_procedure',    name: '行政手続法',      href: '/law/admin_procedure' },
  { id: 'admin_appeal',       name: '行政不服審査法',  href: '/law/admin_appeal' },
  { id: 'admin_litigation',   name: '行政事件訴訟法',  href: '/law/admin_litigation' },
  { id: 'state_liability',    name: '国家賠償法',      href: '/law/state_liability' },
  { id: 'admin_enforcement',  name: '行政代執行法',    href: '/law/admin_enforcement' },
  { id: 'national_admin_org', name: '国家行政組織法',  href: '/law/national_admin_org' },
  { id: 'local_autonomy',     name: '地方自治法',      href: '/law/local_autonomy' },
  { id: 'civil_code',         name: '民法',            href: '/law/civil_code' },
  { id: 'commercial_code',    name: '商法',            href: '/law/commercial_code' },
  { id: 'company_act',        name: '会社法',          href: '/law/company_act' },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-12 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-800 mb-2">
          行政書士過去問六法（β）
        </h1>
        <p className="text-sm text-gray-500 mb-10 leading-6">
          条文の出題射程を可視化した六法です。<br />
          過去問から抽出した根拠条文をもとに<br />
          出題箇所と出題頻度を表示します。
        </p>

        <InstallPrompt />

        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-8">
          法律を選ぶ
        </h2>

        <ul className="space-y-3">
          {LAWS.map(law => (
            <li key={law.id}>
              <Link
                href={law.href}
                className="flex items-center justify-between gap-3 px-5 py-4 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm"
              >
                <span className="font-semibold text-gray-800">{law.name}</span>
                <span className="text-gray-400 text-xl shrink-0">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
