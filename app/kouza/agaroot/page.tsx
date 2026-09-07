import type { Metadata } from 'next';
import Link from 'next/link';
import { PRICE_AS_OF, getProvider } from '@/lib/kouza';
import AdDisclosure from '@/components/kouza/AdDisclosure';
import CourseCta from '@/components/kouza/CourseCta';

const P = getProvider('agaroot');

export const metadata: Metadata = {
  title: { absolute: 'アガルート行政書士講座の内容・価格・合格特典' },
  description:
    `アガルートアカデミーの行政書士講座について、入門カリキュラムの内容と税込価格、合格特典（お祝い金5万円または全額返金）の条件、` +
    `令和7年度の受講生合格率52.59%、KIKERUKUNによる質問サポート、フルカラーテキスト、担当講師をまとめました。${PRICE_AS_OF}時点の公式情報にもとづく記載です。`,
  alternates: { canonical: '/kouza/agaroot' },
  openGraph: {
    title: 'アガルート行政書士講座の内容・価格・合格特典',
    description:
      '入門カリキュラムの構成、合格特典の条件、合格実績、質問サポート、テキスト、講師陣を公式情報にもとづいて整理しました。',
    url: '/kouza/agaroot',
  },
};

export default function AgarootPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <nav aria-label="パンくず" className="mb-3 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link href="/kouza/gyosei" className="text-blue-600 hover:underline">通信講座の比較</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">アガルート</span>
      </nav>

      <AdDisclosure />

      <h1 className="mb-3 text-2xl font-bold leading-9 text-gray-800">
        アガルート行政書士講座の内容・価格・合格特典
      </h1>

      <p className="mb-4 text-[15px] leading-8 text-gray-800">
        アガルートアカデミー（運営：{P.company}）の行政書士試験対策講座について、
        {PRICE_AS_OF}時点で公式サイトに記載されている内容を整理しました。
        当サイトは条文と過去問の出題実績を扱っているため、条文を軸に学習している人から見た評価軸で書いています。
      </p>

      <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-600">
        価格・キャンペーン・制度は変更されます。申し込み前に必ず公式サイトの表示をご確認ください。
        合否は個々の学習量や状況により、特定の講座で合格を保証するものではありません。
      </div>

      {/* 1. カリキュラム */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">1. カリキュラムの構成</h2>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          初学者向けの中心になるのが「入門カリキュラム」で、フルとライトの2種類があります。
          両者の差は含まれる講座の本数です。フルには
          <strong>全体構造編・入門総合講義・短答過去問解説講座・記述過去問解説講座・他資格民法パーフェクト80・模擬試験・
          逐条ローラーインプット講座・文章理解対策講座・時事統計対策講座</strong>が入り、
          ライトからは逐条ローラーインプット講座と文章理解対策講座と全体構造編が外れます。
        </p>

        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="mb-2 text-sm font-bold text-blue-900">
            条文で学ぶ人にとっての要は「逐条ローラーインプット講座」
          </p>
          <p className="text-sm leading-7 text-blue-900">
            {P.fitForArticleStudy}
          </p>
        </div>

        <h3 className="mb-2 text-sm font-bold text-gray-700">
          価格（{PRICE_AS_OF}時点・税込・セール適用時）
        </h3>
        <ul className="mb-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
          {P.courses.map(c => (
            <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2.5">
              <span className="text-sm text-gray-800">
                {c.name}
                {c.note && <span className="ml-2 text-[11px] text-gray-500">（{c.note}）</span>}
              </span>
              <span className="text-sm font-bold text-gray-800">{c.price}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-6 text-gray-500">
          いずれもセール適用時の税込価格です。セールは期間で入れ替わるため、現在の価格は公式サイトでご確認ください。
        </p>
      </section>

      {/* 2. 合格特典（提携条件で必須） */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">2. 合格特典（お祝い金5万円または全額返金）</h2>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          アガルートには合格特典があり、対象カリキュラムを受講して合格した場合、
          <strong>お祝い金5万円</strong>（源泉徴収税を差し引いた44,895円分のAmazonギフト券）か、
          <strong>受講料の全額返金</strong>のいずれかを選べます。
          全額返金を選べば、支払った受講料が戻ってくる形になります。
        </p>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          ただし条件があり、ここは申し込み前に必ず押さえておく必要があります。
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-5 text-[15px] leading-8 text-gray-800">
          <li>
            対象は<strong>「フル」カリキュラムと速習カリキュラム</strong>です。
            入門総合講義の単体、「ライト」版カリキュラム、豊村ゼミは対象外と公式に明記されています。
          </li>
          <li>
            全額返金の場合、合格通知書データ・再現記述・合格体験記の提出に加えて、
            <strong>合格者インタビューへの出演</strong>が条件です。
            お祝い金の場合は合格通知書データと合格体験記の提出が条件になります。
          </li>
          <li>
            返金額は<strong>税抜価格</strong>です。セール価格で購入した場合は、そのセール価格の税抜額が返金されます。
          </li>
        </ul>
        <p className="text-[15px] leading-8 text-gray-800">
          つまり「実質0円で受講できる可能性がある」制度ですが、それはフルカリキュラムを選び、
          合格し、インタビュー出演まで引き受けた場合の話です。
          ライトを選ぶと安く始められる代わりにこの特典は付きません。この差は金額が大きいので、
          どちらを選ぶかは特典の有無まで含めて比べたほうが判断しやすくなります。
        </p>
      </section>

      {/* 3. 合格実績（提携条件で必須） */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">3. 公表されている合格実績</h2>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          アガルートは受講生の合格率を公表しています。公式サイトの記載によれば、
          <strong>令和7年度（2025年度）行政書士試験におけるアガルート受講生の合格率は52.59%</strong>で、
          同年度の全国平均合格率14.54%の<strong>3.62倍</strong>にあたります。
        </p>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          行政書士試験の合格率は例年10%前後で推移してきた試験なので、
          受験生のうち合格するのは10人に1人程度という水準です。
          そこに対して受講生の半数超が合格しているという数字を出していることになります。
        </p>
        <p className="text-xs leading-6 text-gray-500">
          ※ 合格率はアガルートアカデミーの発表による数値です（{PRICE_AS_OF}時点の公式サイト記載）。
          集計の母数などの詳細は公式サイトの記載をご確認ください。
        </p>
      </section>

      {/* 4. サポート・テキスト・講師（提携条件で必須） */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">4. サポート・テキスト・講師陣</h2>

        <h3 className="mb-2 mt-5 text-sm font-bold text-gray-700">質問サポート（KIKERUKUN）</h3>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          オンライン質問サービス「KIKERUKUN」が用意されていて、
          <strong>フルカリキュラムは100回、ライトカリキュラムは50回</strong>まで質問を送れます。
          回答するのは講師または有資格者です。
          条文を単位にして学習を進めると「この文言はどこまでを指すのか」という細かい疑問が積み上がります。
          独学だとそこで止まってしまいがちなので、回数の上限が明示されている質問窓口があるのは実務的な意味があります。
        </p>

        <h3 className="mb-2 mt-5 text-sm font-bold text-gray-700">テキスト</h3>
        <p className="mb-4 text-[15px] leading-8 text-gray-800">
          テキストはアガルートが自社で制作しているオリジナル教材で、フルカラーです。
          デジタルブック機能も用意されており、講義とテキストが同じ設計思想で作られているため、
          講義を聞きながらどこを説明しているかを追いやすい構成になっています。
          市販のテキストと講義を別々に組み合わせる場合と違い、参照先がずれない点が扱いやすいところです。
        </p>

        <h3 className="mb-2 mt-5 text-sm font-bold text-gray-700">講師陣</h3>
        <p className="mb-3 text-[15px] leading-8 text-gray-800">
          入門カリキュラムは講師別にクラスが分かれており、豊村慶太講師と田島圭祐講師のクラスがあります。
        </p>
        <ul className="mb-4 list-disc space-y-2 pl-5 text-[15px] leading-8 text-gray-800">
          <li>
            <strong>豊村慶太講師</strong>：早稲田大学社会科学部卒業。大学3年次に2か月の学習期間で行政書士試験に合格。
            大手資格予備校で12年以上にわたり看板講師を務め、講師歴は20年を超えます。
            公式サイトでは、初学者に対しては豊富な具体例を使ったわかりやすさを、
            中上級者に対しては他資格の過去問を使った深さのある講義を掲げ、
            初期段階からアウトプットを意識した学習を方針としています。
          </li>
          <li>
            <strong>田島圭祐講師</strong>：大学入試予備校で政治経済と現代文を20年にわたり指導してきた経歴があり、
            文章理解の対策を担当しています。行政書士試験の文章理解は現代文の読解そのものなので、
            出自がそのまま対策に直結している領域です。
          </li>
          <li>
            <strong>相賀真理子講師</strong>：憲法の重要判例を音声で扱う教材などを担当しています。
          </li>
        </ul>
        <p className="text-[15px] leading-8 text-gray-800">
          講師によって進め方の相性は分かれます。クラスを選べる形になっているので、
          資料請求でできる無料体験で実際の講義を見てから決めるのが確実です。
        </p>
      </section>

      {/* 5. 向き不向き */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-gray-800">5. 向いている人・そうでない人</h2>
        <div className="mb-4 rounded-xl border border-gray-200 px-4 py-4">
          <p className="mb-2 text-sm font-bold text-gray-800">向いている</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7 text-gray-700">
            <li>条文を軸に学習していて、講義もその順番で受けたい</li>
            <li>合格特典まで含めて考えたときの実質負担で判断したい</li>
            <li>質問できる窓口を確保しておきたい</li>
            <li>テキストと講義が同じ設計で揃っているほうが進めやすい</li>
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 px-4 py-4">
          <p className="mb-2 text-sm font-bold text-gray-800">合わない可能性がある</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7 text-gray-700">
            <li>初期費用をできるだけ抑えたい（フルカリキュラムは他社より高い価格帯です）</li>
            <li>合格しても体験記の提出やインタビュー出演はしたくない（全額返金の条件に含まれます）</li>
            <li>1回5分程度の細切れ講義でスマホだけで進めたい（その用途は他社のほうが構成が合います）</li>
          </ul>
        </div>
      </section>

      <CourseCta providerId={P.id} officialUrl={P.officialUrl} name={P.name} />

      <details className="mt-6">
        <summary className="cursor-pointer py-2 text-xs text-gray-500 hover:text-gray-700">
          このページの出典
        </summary>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-6 text-gray-500">
          {P.sources.map(s => (
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
          <li>
            <a
              href="https://www.agaroot.jp/lecturer/keita_toyomura/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-blue-600 hover:underline"
            >
              アガルートアカデミー講師紹介｜豊村慶太
            </a>
          </li>
        </ul>
      </details>

      {P.unverified.length > 0 && (
        <div className="mt-6 rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-6 text-gray-600">
          <p className="mb-1 font-semibold text-gray-700">公式サイトで確認できなかった項目</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {P.unverified.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-12 border-t border-gray-100 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">他社と比べる</h2>
        <Link
          href="/kouza/gyosei"
          className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <span>行政書士通信講座4社の比較を見る</span>
          <span className="shrink-0 text-lg text-gray-400">›</span>
        </Link>
      </section>
    </main>
  );
}
