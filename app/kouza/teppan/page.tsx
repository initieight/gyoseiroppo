import type { Metadata } from 'next';
import Link from 'next/link';
import { PRICE_AS_OF, TEPPAN, A8_TEPPAN } from '@/lib/kouza';
import AdDisclosure from '@/components/kouza/AdDisclosure';

export const metadata: Metadata = {
  title: { absolute: '行政書士TEPPAN通信講座の内容・価格・教材' },
  description:
    `行政書士TEPPAN通信講座（オンスク.JP）の内容・税込価格・教材を、公式サイトの記載にもとづいて整理しました。` +
    `TAC出版のスッキリシリーズと約53時間の講義動画、練習問題422問と過去問7回分の構成です。${PRICE_AS_OF}時点の情報です。`,
  alternates: { canonical: '/kouza/teppan' },
  openGraph: {
    title: '行政書士TEPPAN通信講座の内容・価格・教材',
    description:
      '市販テキストに準拠した約53時間の講義動画と、練習問題422問・過去問7回分。買い切り型の構成を公式情報で整理しました。',
    url: '/kouza/teppan',
  },
};

export default function TeppanPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <nav aria-label="パンくず" className="mb-3 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link href="/kouza/gyosei" className="text-blue-600 hover:underline">通信講座</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">TEPPAN</span>
      </nav>

      <AdDisclosure />

      <h1 className="mb-3 text-2xl font-bold leading-9 text-gray-800">
        行政書士TEPPAN通信講座の内容・価格・教材
      </h1>

      <p className="mb-4 text-[15px] leading-8 text-gray-800">
        {TEPPAN.name}（運営：{TEPPAN.company}）は、市販の書籍に準拠した講義動画とオンライン問題演習を
        セットにした買い切り型の講座です。ここでは{PRICE_AS_OF}時点で公式サイトに記載されている内容を
        単独で詳しく整理しています。他社と横並びで見たい場合は
        <Link href="/kouza/gyosei" className="text-blue-600 hover:underline">5社の比較ページ</Link>
        をご覧ください。
      </p>

      <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-600">
        {PRICE_AS_OF}時点で公式サイトに記載されていた内容です（{TEPPAN.targetYear}）。
        価格・キャンペーンは変更されます。申し込み前に必ず公式サイトでご確認ください。
        合否は個々の学習量や状況によります。
      </div>

      {/* 最初に誤解を解く */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">
          1. 買い切り型です（月額制ではありません）
        </h2>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          先に間違えやすい点をひとつ。同じ運営会社は月額制のサービス（オンスク.JPの「ウケホーダイ」）も
          提供していますが、<strong>TEPPAN講座はその対象外</strong>と公式サイトに明記されています。
          TEPPANは<strong>買い切り型</strong>です。月額料金で紹介している記事を見かけることがありますが、
          別サービスの料金なので注意してください。
        </p>
        <ul className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
          {TEPPAN.courses.map(c => (
            <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2.5">
              <span className="text-sm text-gray-800">{c.name}</span>
              <span className="text-sm font-bold text-gray-800">{c.price}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-6 text-gray-500">
          いずれも税込。{PRICE_AS_OF}時点の公式サイトの表示です。
        </p>
      </section>

      {/* 教材 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">2. 教材の中身</h2>
        <p className="mb-3 text-[15px] leading-8 text-gray-800">
          この講座の特徴は、教材が<strong>市販の書籍</strong>だという点です。
          オリジナルテキストを作り込むタイプの講座とは方向性が違います。
        </p>
        <ul className="mb-5 list-disc space-y-2 pl-5 text-[15px] leading-8 text-gray-800">
          {TEPPAN.books.map(b => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        <dl className="divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
          <div className="px-4 py-3">
            <dt className="mb-1 font-semibold text-gray-500">講義動画</dt>
            <dd className="leading-7 text-gray-800">{TEPPAN.lectureVolume}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="mb-1 font-semibold text-gray-500">問題演習</dt>
            <dd className="leading-7 text-gray-800">{TEPPAN.practice}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="mb-1 font-semibold text-gray-500">対象科目</dt>
            <dd className="leading-7 text-gray-800">{TEPPAN.subjects}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="mb-1 font-semibold text-gray-500">スマホ利用</dt>
            <dd className="leading-7 text-gray-800">{TEPPAN.mobile}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="mb-1 font-semibold text-gray-500">無料体験</dt>
            <dd className="leading-7 text-gray-800">{TEPPAN.trial}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="mb-1 font-semibold text-gray-500">担当</dt>
            <dd className="leading-7 text-gray-800">{TEPPAN.lecturer}</dd>
          </div>
          <div className="px-4 py-3">
            <dt className="mb-1 font-semibold text-gray-500">合格特典</dt>
            <dd className="leading-7 text-gray-800">{TEPPAN.bonus}</dd>
          </div>
        </dl>
      </section>

      {/* 条文学習との相性 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">3. 条文で学ぶ人から見た相性</h2>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          講義の総時間は約53時間で、収録科目は憲法から一般知識まで一通り揃っています。
          網羅性を積み上げるより、出題されるところに絞って何度も回すことを前提にした構成です。
        </p>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          条文を1条ずつ読み解いていく講義ではないので、条文学習そのものの代わりにはなりません。
          噛み合うのは、条文と出題実績を自分で追える状態にあって、
          全体像の確認と問題演習の量を足したい場合です。
          オンラインの過去問7回分と練習問題422問がセットになっているので、
          条文で理解した内容を問題形式で確認する往復に使えます。
        </p>
        <p className="text-[15px] leading-8 text-gray-800">
          逆に、条文を読んでも制度の全体像がつかめない段階であれば、
          講義時間の長いカリキュラム型のほうが向きます。判断に迷う場合は
          <Link href="/kouza/gyosei" className="text-blue-600 hover:underline">5社の比較ページ</Link>
          で条件を並べて見てください。
        </p>
      </section>

      {/* 注意点 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">4. 申し込む前に確認しておきたい点</h2>
        <ul className="mb-5 list-disc space-y-2 pl-5 text-[15px] leading-8 text-gray-800">
          <li>
            テキストは市販書籍です。すでに『スッキリわかる行政書士』を持っているなら
            「書籍なし」を選べます。価格差は書籍代とおおむね対応しています。
          </li>
          <li>
            公式サイトには{TEPPAN.targetYear}と記載されています。受験予定の年度と合っているか確認してください。
          </li>
          <li>
            無料体験は登録するだけで試せます。講義動画5本と問題演習を触れるので、
            合うかどうかは先に確かめられます。
          </li>
        </ul>

        <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-6 text-gray-600">
          <p className="mb-1 font-semibold text-gray-700">公式サイトで確認できなかった項目</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {TEPPAN.unverified.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA（A8.net） */}
      <div className="mt-8">
        <a
          href={A8_TEPPAN.url}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-center text-sm font-bold text-white transition-colors hover:bg-blue-800"
        >
          {TEPPAN.name}の公式サイトを見る
          <span aria-hidden>→</span>
        </a>
        {/* A8.net のインプレッション計測用1x1画像 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={A8_TEPPAN.impression} width={1} height={1} alt="" style={{ border: 0 }} />
        <p className="mt-2 text-[11px] leading-5 text-gray-500">
          このリンクは広告です。価格・キャンペーン・教材の内容は変更されることがあります。
          申し込み前に必ず公式サイトの表示をご確認ください。
        </p>
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer py-2 text-xs text-gray-500 hover:text-gray-700">
          このページの出典
        </summary>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-6 text-gray-500">
          {TEPPAN.sources.map(s => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-blue-600 hover:underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </details>

      <section className="mt-12 border-t border-gray-100 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">他の講座と比べる</h2>
        <Link
          href="/kouza/gyosei"
          className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <span>行政書士通信講座5社の比較を見る</span>
          <span className="shrink-0 text-lg text-gray-400">›</span>
        </Link>
      </section>
    </main>
  );
}
