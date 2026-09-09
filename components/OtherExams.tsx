import { OTHER_EXAMS, type OtherExamArticle } from '@/lib/laws';

/**
 * 他資格試験の出題実績。
 * 行政書士の数字とは合算せず、別ブロックで出す。
 * 検証の水準が行政書士分と違うので、その旨を必ず添える。
 */
export function OtherExamBlock({ data }: { data: OtherExamArticle | undefined }) {
  if (!data || data.total <= 0) return null;
  const rows = OTHER_EXAMS.map(e => ({ ...e, v: data.byExam[e.id] })).filter(r => r.v);

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <h2 className="mb-2 text-sm font-bold text-gray-700">
        他資格でも問われています（R2〜R7・のべ{data.total}問）
      </h2>
      <ul className="mb-2 space-y-1.5">
        {rows.map(r => (
          <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <span className="w-16 shrink-0 font-semibold text-gray-700">{r.name}</span>
            <span className="font-bold text-gray-800">{r.v!.count}問</span>
            <span className="flex flex-wrap gap-1">
              {r.v!.years.map(y => (
                <span key={y} className="rounded bg-white px-1 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200">
                  {y}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-5 text-gray-500">
        同じ条文が他の法律系資格でも問われているかどうかの目安です。行政書士試験の出題実績とは
        別に集計しており、合算していません。
        <strong>他資格分は行政書士分ほど検証できていない</strong>ため、参考としてご覧ください。
      </p>
    </section>
  );
}

/** 一覧・ランキングの行に添える小さいバッジ */
export function OtherExamBadge({ data }: { data: OtherExamArticle | undefined }) {
  if (!data || data.total <= 0) return null;
  const names = OTHER_EXAMS.filter(e => data.byExam[e.id]).map(e => e.short);
  return (
    <span
      className="ml-2 whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
      title={`他資格でものべ${data.total}問（${names.join('・')}）`}
    >
      他資格 {data.total}
    </span>
  );
}
