import type { Metadata } from 'next';

// トップ・法律一覧から辿れない旧ページ。/law/admin_procedure と内容が重複するため
// 検索インデックス対象から外す（機能自体は残す）。
export const metadata: Metadata = {
  title: '行政手続法 出題箇所（旧ページ）',
  robots: { index: false, follow: false },
};

export default function AdminProcedureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
