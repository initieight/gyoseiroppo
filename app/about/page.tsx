import type { Metadata } from 'next';
import Link from 'next/link';
import { LAWS, EXAM_RANGE, SITE_NAME } from '@/lib/laws';
import { OPERATOR_NAME, CONTACT_EMAIL, DATA_SOURCE_NOTE } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}について｜サイトの目的・データの出典・免責事項` },
  description:
    `${SITE_NAME}の運営方針、条文本文と出題実績データの出典、免責事項、運営者情報をまとめたページです。` +
    '行政書士試験の学習を効率化するための情報サイトであり、行政書士業務の依頼を受け付けるサイトではありません。',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <nav aria-label="パンくず" className="mb-4 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">このサイトについて</span>
      </nav>

      <h1 className="mb-5 text-2xl font-bold text-gray-800">{SITE_NAME}について</h1>

      {/* 目的 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">サイトの目的</h2>
        <p className="mb-3 text-[15px] leading-8 text-gray-800">
          {SITE_NAME}は、行政書士試験の学習を効率化するために作った無料のWeb六法です。
          {LAWS.length}法令の条文を収録し、各条文に「行政書士試験の過去問（{EXAM_RANGE}）で何回・どの年度に出題されたか」を
          あわせて表示しています。
        </p>
        <p className="text-[15px] leading-8 text-gray-800">
          市販の条文集は条文の順に並んでいるだけなので、どこが試験で問われるのかは分かりません。
          一方で過去問集を解いても、根拠条文の前後にある関連条文までは目に入りません。
          この2つを1つの画面にまとめて、条文を読みながら出題箇所を確認できる状態にすることを目的にしています。
        </p>
      </section>

      {/* データの出典 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">データの出典</h2>
        <div className="space-y-3 text-[15px] leading-8 text-gray-800">
          {DATA_SOURCE_NOTE.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a
              href="https://laws.e-gov.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              e-Gov 法令検索（デジタル庁）
            </a>
            <span className="ml-2 text-xs text-gray-500">条文本文の一次情報</span>
          </li>
          <li>
            <a
              href="https://gyosei-shiken.or.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              一般財団法人 行政書士試験研究センター
            </a>
            <span className="ml-2 text-xs text-gray-500">試験の実施要項・過去問の一次情報</span>
          </li>
        </ul>
      </section>

      {/* 免責事項 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">免責事項</h2>
        <ul className="list-disc space-y-3 pl-5 text-[15px] leading-8 text-gray-800">
          <li>
            当サイトの掲載内容を利用して行った学習の結果、および試験の結果について、
            当サイトは一切の責任を負いません。
          </li>
          <li>
            条文は法令改正によって変わります。当サイトの反映にはタイムラグが生じるため、
            掲載されている条文が最新であることを保証できません。
            重要な判断をする際は、必ず e-Gov 法令検索で現行の条文をご確認ください。
          </li>
          <li>
            出題実績は独自分析による集計であり、公式に発表されたものではありません。
            根拠条文の割り当てに誤りや取りこぼしが含まれる可能性があります。
          </li>
          <li>
            当サイトはβ版です。データとページは順次追加・修正しており、内容は予告なく変更されます。
          </li>
          <li>
            当サイトには広告を含むページがあります。広告を含むページには、そのページ内にその旨を表示しています。
          </li>
        </ul>
      </section>

      {/* 誤認防止 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">
          行政書士業務の依頼は受け付けていません
        </h2>
        <p className="text-[15px] leading-8 text-gray-800">
          当サイトは行政書士試験の受験生向けの学習情報サイトです。
          行政書士業務としての法律相談、官公署に提出する書類の作成、その他の代理・相談業務の依頼は
          一切受け付けていません。具体的な事案についてのご相談は、
          お住まいの地域の行政書士会や、該当する分野の専門家にお問い合わせください。
        </p>
      </section>

      {/* 運営者情報 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">運営者情報</h2>
        <dl className="divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
            <dt className="w-20 shrink-0 font-semibold text-gray-500">運営者</dt>
            <dd className="text-gray-800">{OPERATOR_NAME}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
            <dt className="w-20 shrink-0 font-semibold text-gray-500">サイト名</dt>
            <dd className="text-gray-800">{SITE_NAME}（gyoseiroppo.com）</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
            <dt className="w-20 shrink-0 font-semibold text-gray-500">連絡先</dt>
            <dd className="text-gray-800">
              {CONTACT_EMAIL ? (
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              ) : (
                <span className="text-gray-600">準備中</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-6 text-gray-500">
          当サイトは個人で運営している情報サイトであり、自ら商品・役務を販売していないため、
          特定商取引法に基づく表示の対象外です。
        </p>
      </section>

      <section className="mt-12 border-t border-gray-100 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">サイト内を見る</h2>
        <ul className="grid grid-cols-2 gap-2">
          <li>
            <Link
              href="/"
              className="block rounded-lg border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              トップ
            </Link>
          </li>
          <li>
            <Link
              href="/law"
              className="block rounded-lg border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              法律一覧
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
