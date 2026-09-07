import { countBasis, EXAM_RANGE } from '@/lib/laws';

/**
 * 集計方法の注記。
 * 民法は1問が論点ブロック内の複数条文に加算されているため、
 * 「出題回数」として読めない。その旨をページ上で明示する。
 */
export default function CountBasisNotice({ lawId }: { lawId: string }) {
  if (countBasis(lawId) !== 'topic-block') return null;

  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
      <p className="mb-1 font-bold">この数字の読み方（民法）</p>
      <p>
        民法の集計は<strong>論点単位</strong>です。1問につき、その論点に関係する条文のまとまり全体に
        カウントが入っています（1問あたり平均7条前後）。そのため
        <strong>「その条文が単独で問われた回数」ではありません</strong>。
        条文どうしの相対的な重要度を、この数字だけで判断しないでください。
      </p>
      <p className="mt-1">
        問題単位で集計し直す作業を進めています。それまでは
        「{EXAM_RANGE}の過去問で、この論点まわりがどれくらい問われているか」の目安としてお使いください。
        他の法令は問題単位の集計なので、この注記は付きません。
      </p>
    </div>
  );
}
