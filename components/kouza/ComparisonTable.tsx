import { PROVIDERS, PRICE_AS_OF } from '@/lib/kouza';

const ROWS: { key: keyof (typeof PROVIDERS)[number]['table']; label: string }[] = [
  { key: 'price', label: '価格帯（税込）' },
  { key: 'lecture', label: '講義の形態' },
  { key: 'textbook', label: 'テキスト' },
  { key: 'qa', label: '質問サポート' },
  { key: 'bonus', label: '合格特典・返金' },
  { key: 'trial', label: '無料体験・資料請求' },
  { key: 'record', label: '合格実績の公表' },
];

export default function ComparisonTable() {
  return (
    <div>
      {/* 横スクロールはこのコンテナ内だけで起きるようにする */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <caption className="sr-only">
            行政書士通信講座5社の比較表（{PRICE_AS_OF}時点）
          </caption>
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="w-24 border-b border-gray-200 px-3 py-2.5 font-semibold text-gray-500">
                比較項目
              </th>
              {PROVIDERS.map(p => (
                <th
                  key={p.id}
                  scope="col"
                  className="border-b border-l border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-800"
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.key} className="align-top even:bg-gray-50/60">
                <th
                  scope="row"
                  className="border-b border-gray-100 px-3 py-3 font-semibold text-gray-500"
                >
                  {row.label}
                </th>
                {PROVIDERS.map(p => (
                  <td
                    key={p.id}
                    className="border-b border-l border-gray-100 px-3 py-3 leading-6 text-gray-700"
                  >
                    {p.table[row.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-gray-500">
        ※ 表は横にスクロールできます。{PRICE_AS_OF}時点で各社公式サイトに記載されていた内容です。
        セール価格・キャンペーンは期間で変わるため、最新の条件は各社公式サイトでご確認ください。
      </p>
    </div>
  );
}
