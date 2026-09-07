import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/laws';
import { PROVIDERS, RECOMMENDATIONS, PRICE_AS_OF, getProvider } from '@/lib/kouza';
import AdDisclosure from '@/components/kouza/AdDisclosure';
import ComparisonTable from '@/components/kouza/ComparisonTable';
import CourseCta from '@/components/kouza/CourseCta';

export const metadata: Metadata = {
  title: { absolute: '行政書士通信講座4社を条文学習との相性で比較' },
  description:
    `アガルート・スタディング・資格スクエア・東京法経学院の行政書士通信講座を、価格・講義形態・テキスト・質問サポート・合格特典・合格実績の公表状況で比較。` +
    `条文を軸に学ぶ受験生から見てどう違うかという視点でまとめています。${PRICE_AS_OF}時点の公式情報にもとづく記載です。`,
  alternates: { canonical: '/kouza/gyosei' },
  openGraph: {
    title: '行政書士通信講座を条文学習の相性で比較（4社）',
    description:
      'アガルート・スタディング・資格スクエア・東京法経学院を、条文を軸に学ぶ受験生の視点で比較しました。',
    url: '/kouza/gyosei',
  },
};

export default function KouzaGyoseiPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-16">
      {/* パンくず */}
      <nav aria-label="パンくず" className="mb-3 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">行政書士通信講座の比較</span>
      </nav>

      {/* ファーストビューの広告表記（ステマ規制対応・必須） */}
      <AdDisclosure />

      <h1 className="mb-3 text-2xl font-bold leading-9 text-gray-800">
        行政書士通信講座4社を「条文学習との相性」で比較する
      </h1>

      <p className="mb-4 text-[15px] leading-8 text-gray-800">
        {SITE_NAME}は、行政書士試験の過去問から抽出した出題条文を条文本文と一緒に表示するサイトです。
        つまりここを読んでいる人は、程度の差はあれ条文を軸に学習を組み立てています。
        通信講座を選ぶときも、そのやり方と噛み合うかどうかで見え方が変わります。
      </p>
      <p className="mb-4 text-[15px] leading-8 text-gray-800">
        このページでは、アガルートアカデミー・スタディング・資格スクエア・東京法経学院の4社について、
        価格・講義形態・テキスト・質問サポート・合格特典・合格実績の公表状況を並べたうえで、
        「条文を読みながら進める人にとってどう違うか」を1社ずつ書いています。
        どれが一番いいという書き方はしていません。学習段階と使える時間で答えが変わるためです。
      </p>

      <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-6 text-gray-600">
        <p className="mb-1 font-semibold text-gray-700">このページの前提</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>掲載内容は<strong>{PRICE_AS_OF}時点</strong>で各社公式サイトに記載されていたものです。</li>
          <li>価格・キャンペーン・制度は変更されます。申し込み前に必ず各社公式サイトでご確認ください。</li>
          <li>公式サイトで確認できなかった項目は「確認できず」と明記し、推測では書いていません。</li>
          <li>合否は個々の学習量や状況によります。特定の講座で合格を保証するものではありません。</li>
        </ul>
      </div>

      {/* 比較表 */}
      <section className="mb-12">
        <h2 className="mb-3 text-lg font-bold text-gray-800">1. 4社の比較表</h2>
        <ComparisonTable />
      </section>

      {/* 用途別 */}
      <section className="mb-12">
        <h2 className="mb-2 text-lg font-bold text-gray-800">2. 学習段階・条件別の考え方</h2>
        <p className="mb-4 text-sm leading-7 text-gray-700">
          順位はつけていません。同じ4社でも、いま自分がどの段階にいるかで向き不向きが入れ替わるためです。
        </p>
        <ul className="space-y-3">
          {RECOMMENDATIONS.map(r => {
            const p = getProvider(r.providerId);
            return (
              <li key={r.label} className="rounded-xl border border-gray-200 px-4 py-4">
                <p className="mb-1 text-sm font-bold text-gray-800">{r.label}</p>
                <p className="mb-2 text-xs text-gray-500">{r.who}</p>
                <p className="text-sm leading-7 text-gray-700">
                  <a href={`#${p.id}`} className="font-semibold text-blue-700 hover:underline">
                    {p.name}
                  </a>
                  ：{r.reason}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 各社詳細 */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-bold text-gray-800">3. 各社の詳細</h2>

        {PROVIDERS.map(p => (
          <article
            key={p.id}
            id={p.id}
            className="mb-10 scroll-mt-4 rounded-xl border border-gray-200 px-4 py-5 sm:px-6"
          >
            <h3 className="mb-1 text-lg font-bold text-gray-800">{p.name}</h3>
            <p className="mb-3 text-xs text-gray-500">運営：{p.company}</p>

            <p className="mb-5 text-[15px] leading-8 text-gray-800">{p.summary}</p>

            <h4 className="mb-2 text-sm font-bold text-gray-700">条文で学ぶ人から見た相性</h4>
            <p className="mb-5 text-[15px] leading-8 text-gray-800">{p.fitForArticleStudy}</p>

            <h4 className="mb-2 text-sm font-bold text-gray-700">
              主なコースと価格（{PRICE_AS_OF}時点・税込）
            </h4>
            <ul className="mb-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
              {p.courses.map(c => (
                <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2.5">
                  <span className="text-sm text-gray-800">
                    {c.name}
                    {c.note && <span className="ml-2 text-[11px] text-gray-500">（{c.note}）</span>}
                  </span>
                  <span className="text-sm font-bold text-gray-800">{c.price}</span>
                </li>
              ))}
            </ul>

            <h4 className="mb-2 text-sm font-bold text-gray-700">申し込む前に確認しておきたい点</h4>
            <ul className="mb-5 list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
              {p.cautions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>

            {p.unverified.length > 0 && (
              <div className="mb-5 rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-6 text-gray-600">
                <p className="mb-1 font-semibold text-gray-700">公式サイトで確認できなかった項目</p>
                <ul className="list-disc space-y-0.5 pl-4">
                  {p.unverified.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            )}

            <CourseCta providerId={p.id} officialUrl={p.officialUrl} name={p.name} />

            <details className="mt-4">
              <summary className="cursor-pointer py-2 text-xs text-gray-500 hover:text-gray-700">
                このセクションの出典
              </summary>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-6 text-gray-500">
                {p.sources.map(s => (
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
          </article>
        ))}
      </section>

      {/* 講座を取らない選択 */}
      <section className="mb-12">
        <h2 className="mb-3 text-lg font-bold text-gray-800">4. 講座を取らないという選択について</h2>
        <p className="mb-3 text-[15px] leading-8 text-gray-800">
          行政書士試験は独学でも受かる試験です。実際、条文と過去問だけで合格している人はいます。
          このサイトが出題条文と出題回数を無料で出しているのも、そこが独学の一番きつい部分だからです。
        </p>
        <p className="mb-3 text-[15px] leading-8 text-gray-800">
          講座を検討する価値が出てくるのは、独学で次のどれかに当たったときだと考えています。
          条文を読んでも制度の全体像がつかめない、記述式の書き方が分からない、
          質問できる相手がいなくて同じところで何度も止まる、学習の順番を自分で組めない。
          逆に、条文と過去問を回せていて手応えがあるなら、急いで講座を取る理由はありません。
        </p>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">先に無料で試せること</p>
          <p className="text-sm leading-7 text-gray-700">
            4社とも無料体験または資料請求を用意しています。講義の話し方やテキストの見やすさは、
            文章で比較するより実際に見たほうが早く判断できます。
            まずそこで自分に合うかを確かめてから決めるのが確実です。
          </p>
        </div>
      </section>

      {/* サイト内導線 */}
      <section className="mt-12 border-t border-gray-100 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">条文から学習を進める</h2>
        <ul className="grid grid-cols-2 gap-2">
          <li>
            <Link
              href="/law"
              className="block rounded-lg border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              法律一覧
            </Link>
          </li>
          <li>
            <Link
              href="/ranking/civil_code"
              className="block rounded-lg border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              民法 出題ランキング
            </Link>
          </li>
          <li>
            <Link
              href="/ranking/admin_appeal"
              className="block rounded-lg border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              行政不服審査法 出題ランキング
            </Link>
          </li>
          <li>
            <Link
              href="/kouza/agaroot"
              className="block rounded-lg border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              アガルート行政書士講座の詳細
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
