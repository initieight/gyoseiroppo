/**
 * 「抽象度が高いほど正解の源泉に近い」の階層図。
 *
 * 画像ではなく HTML で組んでいる。横長の画像だとスマホで文字が潰れるため。
 * テキストなので検索エンジンにも読める。
 */

const LAYERS = [
  {
    label: '条文',
    lead: '最終的な判断根拠',
    width: 'w-[62%]',
    bg: 'bg-red-500',
  },
  {
    label: '判例',
    lead: '最高裁の判断。条文を「生きたルール」に具体化する',
    note: '試験の正解は、ここと条文にある',
    noteTone: 'good' as const,
    width: 'w-[78%]',
    bg: 'bg-orange-500',
  },
  {
    label: '過去問演習',
    lead: '使い方次第で、上にも下にも行き来できる踏み台',
    note: '答えの暗記だけでは条文・判例に届かない',
    noteTone: 'warn' as const,
    width: 'w-[90%]',
    bg: 'bg-blue-500',
  },
  {
    label: '予備校本・入門書',
    lead: 'わかりやすく噛み砕いた素材。入り口として有用だが、最終答案の根拠ではない',
    width: 'w-full',
    bg: 'bg-amber-400',
  },
];

export default function KnowledgePyramid() {
  return (
    <figure className="my-6">
      <figcaption className="mb-3 text-center text-sm font-bold text-gray-800">
        抽象度が高いほど「正解の源泉」に近い
      </figcaption>

      <div className="flex gap-3">
        <ol className="min-w-0 flex-1 space-y-1.5">
          {LAYERS.map(l => (
            <li key={l.label} className="flex justify-center">
              <div className={`${l.width} ${l.bg} rounded-lg px-3 py-3 text-white`}>
                <p className="text-center text-sm font-bold leading-6">{l.label}</p>
                <p className="mt-0.5 text-center text-[11px] leading-5 text-white/90">{l.lead}</p>
                {l.note && (
                  <p
                    className={`mx-auto mt-2 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${
                      l.noteTone === 'good' ? 'bg-white text-orange-700' : 'bg-white/90 text-blue-700'
                    }`}
                  >
                    {l.noteTone === 'good' ? '★ ' : '△ '}
                    {l.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* 抽象度の軸 */}
        <div
          aria-hidden
          className="flex w-8 shrink-0 flex-col items-center justify-between py-1 text-[10px] font-bold"
        >
          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-600">高</span>
          <span className="my-1 w-px flex-1 bg-gradient-to-b from-red-300 to-blue-300" />
          <span className="[writing-mode:vertical-rl] text-gray-500">抽象度</span>
          <span className="my-1 w-px flex-1 bg-gradient-to-b from-blue-300 to-blue-200" />
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-blue-600">低</span>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2.5 text-center text-xs font-semibold leading-6 text-gray-700">
        予備校本で理解 → 過去問で問われ方を知る → 条文と判例に戻って定着
      </p>

      <p className="mt-2 text-[11px] leading-5 text-gray-500">
        <span className="font-semibold text-gray-600">学説</span>
        （学者による条文解釈の整理。通説・多数説など）は、判例の解釈に影響を与えたり、
        過去問の解釈のネタになったりしますが、この階層の外にあります。
        行政書士試験で答案の根拠にするものではありません。
      </p>
    </figure>
  );
}
