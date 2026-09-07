import { countBasis, EXAM_RANGE } from '@/lib/laws';

/**
 * 集計方法の注記。
 * 民法は選択肢単位で根拠条文を割り当て、問題単位に集約している。
 * 他の法令とは作り方が違うので、その旨を控えめに明示する。
 */
export default function CountBasisNotice({ lawId }: { lawId: string }) {
  if (countBasis(lawId) !== 'choice') return null;

  return (
    <p className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-600">
      <span className="font-semibold text-gray-700">集計方法：</span>
      民法は、{EXAM_RANGE}の過去問を<strong>選択肢ごと</strong>に読んで根拠条文を割り当て、
      問題単位で集計しています。1問は最大5肢あるため、1つの問題で複数の条文にカウントが入ります。
      独自集計であり公式の発表ではありません。誤りを見つけた場合はご容赦ください。
    </p>
  );
}
