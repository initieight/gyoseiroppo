import type { Metadata } from 'next';
import Link from 'next/link';
import {
  EXAM_RANGE,
  articleHref,
  articleLabel,
  getLawData,
  getHighlightData,
  getOtherExamData,
  getRelatedData,
} from '@/lib/laws';
import KnowledgePyramid from '@/components/KnowledgePyramid';

/**
 * 民法のハブ記事。
 *
 * 本文中の数字はすべて出題データから実行時（ビルド時）に算出する。
 * ハードコードすると、データを直したときに記事だけ古い数字が残る。
 *
 * 学習方法についての記述は、サイト運営者が自ら書いた有料note
 * の
 * 骨格を本人の許可のもとで要約したもの。逐条分析などの核心部分は含めていない。
 */

const LAW_ID = 'civil_code';

async function stats() {
  const [law, hl, other, related] = await Promise.all([
    getLawData(LAW_ID),
    getHighlightData(LAW_ID),
    getOtherExamData(LAW_ID),
    getRelatedData(LAW_ID),
  ]);

  const asked = Object.entries(hl.articles).filter(([, v]) => v.count > 0);
  const questions = new Set(asked.flatMap(([, v]) => v.questions ?? []));
  const twicePlus = asked.filter(([, v]) => v.count >= 2);

  const artNum = (k: string) => {
    const m = k.match(/^(\d+)(?:の(\d+))?/);
    return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 1000 : 0) : 1e9;
  };
  const top = [...asked]
    .sort(
      (a, b) =>
        b[1].count - a[1].count ||
        (b[1].correctCount ?? 0) - (a[1].correctCount ?? 0) ||
        (b[1].choices ?? 0) - (a[1].choices ?? 0) ||
        artNum(a[0]) - artNum(b[0]),
    )
    .slice(0, 5);

  const otherOnly = Object.keys(other.articles).filter(k => !hl.articles[k]);

  return {
    law,
    total: Object.keys(law.articles).length,
    asked: asked.length,
    unasked: Object.keys(law.articles).length - asked.length,
    questionCount: questions.size,
    twicePlus: twicePlus.length,
    once: asked.length - twicePlus.length,
    top,
    otherTotal: Object.keys(other.articles).length,
    otherOnly: otherOnly.length,
    relatedCount: Object.keys(related.articles).length,
    related177: (related.articles['177'] ?? []).slice(0, 4),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await stats();
  return {
    title: { absolute: `行政書士試験の民法｜過去6年で問われた${s.asked}条から優先順位をつける` },
    description:
      `民法は1,167条ありますが、行政書士試験の過去問（${EXAM_RANGE}）で根拠条文になったのは${s.asked}条、` +
      `2回以上問われたのは${s.twicePlus}条だけです。条文と判例に知識を集約する学習法と、` +
      `実際の出題データにもとづく優先順位のつけ方をまとめました。`,
    alternates: { canonical: '/column/minpo' },
    openGraph: {
      title: `行政書士試験の民法｜過去6年で問われた${s.asked}条から優先順位をつける`,
      description: `民法1,167条のうち出題されたのは${s.asked}条。2回以上は${s.twicePlus}条。出題データから優先順位をつける。`,
      url: '/column/minpo',
    },
  };
}

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 mt-10 text-lg font-bold text-gray-800">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 text-[15px] leading-8 text-gray-800">{children}</p>
);

export default async function MinpoColumnPage() {
  const s = await stats();
  const arts = s.law.articles;
  const fmt = (n: number) => n.toLocaleString('ja-JP');

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <nav aria-label="パンくず" className="mb-4 text-xs text-gray-500">
        <Link href="/" className="text-blue-600 hover:underline">トップ</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link href="/law/civil_code" className="text-blue-600 hover:underline">民法</Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <span className="text-gray-700">条文からの攻略</span>
      </nav>

      <h1 className="mb-5 text-2xl font-bold leading-9 text-gray-800">
        行政書士試験の民法は条文から攻略する
      </h1>

      <P>
        行政書士試験の民法では、テキストや過去問を何周するかに意識が向きがちです。
        しかし、本試験で最終的な判断根拠になるのは、テキストでも過去問解説でもありません。
        <strong>条文と判例です。</strong>
      </P>
      <P>
        択一の問題文には、必ず「民法の規定および判例に照らし」と書かれています。
        何が問われているかは、問題文そのものに明記されています。
        予備校本や過去問は、条文と判例を理解するための道具と考えたほうが、民法の知識は整理しやすくなります。
      </P>

      {/* 1 */}
      <H2>民法{fmt(s.total)}条のうち、6年で問われたのは{s.asked}条</H2>
      <P>
        まず範囲の話をします。当サイトでは、{EXAM_RANGE}の行政書士試験の民法（毎年11問・計{s.questionCount}問）について、
        選択肢ごとに根拠条文を割り当てて集計しています。結果はこうなりました。
      </P>
      <dl className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
        {[
          ['民法の全条文', `${fmt(s.total)}条`],
          ['6年間で根拠条文になった', `${s.asked}条（${Math.round((s.asked / s.total) * 100)}%）`],
          ['一度も問われなかった', `${fmt(s.unasked)}条`],
          ['そのうち2回以上問われた', `${s.twicePlus}条`],
          ['1回だけだった', `${s.once}条`],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-2.5">
            <dt className="text-gray-600">{k}</dt>
            <dd className="font-bold text-gray-800">{v}</dd>
          </div>
        ))}
      </dl>
      <P>
        <strong>6年間で2回以上問われた条文は{s.twicePlus}条しかありません。</strong>
        判例六法の全条文を覚えるのは現実的ではないので、絞りをかけます。その絞り方の出発点になる数字が、これです。
      </P>

      {/* 2 */}
      <H2>出題数の上位はここ</H2>
      <P>実際に上位を並べるとこうなります。カッコ内は、その条文が<strong>正解肢の根拠</strong>になった回数です。</P>
      <ol className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
        {s.top.map(([k, v], i) => (
          <li key={k}>
            <Link
              href={articleHref(LAW_ID, k)}
              className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-gray-50"
            >
              <span className="min-w-0">
                <span className="mr-2 font-mono text-xs text-gray-400">#{i + 1}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {articleLabel(k) ?? arts[k]?.title}
                </span>
                {arts[k]?.caption && (
                  <span className="ml-1 text-xs text-gray-500">{arts[k].caption}</span>
                )}
              </span>
              <span className="shrink-0 text-sm font-bold text-gray-700">
                {v.count}問
                <span className="ml-1 text-xs font-normal text-gray-400">
                  （正解肢{v.correctCount ?? 0}）
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mb-4 text-sm">
        <Link href={`/ranking/${LAW_ID}`} className="text-blue-600 hover:underline">
          民法の出題ランキング（{s.asked}条すべて）を見る →
        </Link>
      </p>

      {/* 3 */}
      <H2>知識の置き場所を条文と判例に一本化する</H2>
      <P>勉強を続けていると、次のものが頭の中で混ざってきます。</P>
      <ul className="mb-4 list-disc space-y-1 pl-5 text-[15px] leading-8 text-gray-800">
        <li>テキストで読んだ説明</li>
        <li>講義で聞いた話</li>
        <li>過去問集や模試の解説</li>
        <li>丸暗記した過去問の肢</li>
      </ul>
      <P>
        答えを判断するときは、<strong>この余計なものを全部取り除いて、条文と判例だけに知識を絞ります。</strong>
        知識を増やすのではなく、知識の置き場所を一本化するイメージです。
        正誤の判断がつかないのは、知識が足りないからではなく、判断の根拠が混在しているからであることが少なくありません。
      </P>

      <KnowledgePyramid />

      <P>
        教材には抽象度の階層があります。予備校本や入門書はわかりやすく噛み砕いた素材で、入り口としては有用ですが、
        最終答案の根拠にはなりません。過去問は使い方次第で上にも下にも行き来できる踏み台です。
        <strong>試験の正解があるのは、条文と判例です。</strong>
      </P>

      {/* 4 */}
      <H2>優先順位をつけて印をつける</H2>
      <P>全部を同じ濃さで覚える必要はありません。次の順で絞ります。</P>
      <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-8 text-gray-800">
        <li>予備校の基本書・講義で出てきた条文・判例</li>
        <li>過去問・模試・演習本で出た条文・判例</li>
        <li>平成29年改正で変更された条文</li>
        <li>1〜3でマークした条文に付されたすべての判例</li>
        <li>余裕があれば司法書士試験の肢別問題集の条文・判例</li>
      </ol>
      <P>
        このように範囲を絞って判例六法に落とし込めば、重要論点・頻出論点に絞った条文と判例のデータベースが手元にできます。
        問題を解くときは、そこにアクセスします。
      </P>
      <P>
        <strong>5番については、当サイトのデータからも裏付けが取れます。</strong>
        民法{fmt(s.total)}条のうち、司法試験・予備試験・司法書士試験・宅建で問われた条文は
        <strong>{s.otherTotal}条</strong>あります。うち<strong>{s.otherOnly}条は、
        行政書士試験では6年間出ていないが他資格では問われている</strong>条文です。
        条文ページでは、行政書士の出題実績とは別に、他資格での出題状況も表示しています。
      </P>

      {/* 5 */}
      <H2>条文は「要件と効果」で読む</H2>
      <P>
        重要条文を一字一句暗記する必要はありません。まず
        <strong>どんな条件がそろえば、どんな法律効果が発生するのか</strong>という形で整理します。
        即時取得（民法192条）なら、要件は5つです。
      </P>
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-[15px] leading-8 text-gray-800">
        <li>動産であること</li>
        <li>取引行為によること</li>
        <li>占有を開始したこと</li>
        <li>平穏かつ公然であること</li>
        <li>善意無過失であること</li>
      </ol>
      <blockquote className="mb-4 border-l-4 border-gray-200 pl-4 text-sm leading-7 text-gray-700">
        {arts['192']?.text}
      </blockquote>
      <P>
        問題を見たときに、<strong>「この肢はどの要件を問うているのか」</strong>を考えられるようになることが重要です。
        {' '}
        <Link href={articleHref(LAW_ID, '192')} className="text-blue-600 hover:underline">
          民法192条を見る →
        </Link>
      </P>

      {/* 6 */}
      <H2>ひとつの条文から関連する条文へ広げる</H2>
      <P>
        判例六法には、条文ごとに参照先の条文が付いています。ひとつの条文に目を通せば、
        芋づる式にほかの条文も確認できるようになっています。
        分野横断的・科目横断的な知識が身につきますし、この分野だけずっと手をつけていない、という状態も起きにくくなります。
      </P>
      <P>
        <strong>当サイトでは、これを出題データから機械的に出しています。</strong>
        1つの問題の中で同時に根拠になった条文を数えたもので、{s.relatedCount}条に付いています。
        第177条（不動産の対抗要件）の場合はこうなります。
      </P>
      <ul className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
        {s.related177.map(r => (
          <li key={r.article}>
            <Link
              href={articleHref(LAW_ID, r.article)}
              className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-gray-50"
            >
              <span className="min-w-0 text-sm text-gray-800">
                <span className="font-semibold">{articleLabel(r.article)}</span>
                {arts[r.article]?.caption && (
                  <span className="ml-1 text-xs text-gray-500">{arts[r.article].caption}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-gray-500">同時{r.count}回</span>
            </Link>
          </li>
        ))}
      </ul>
      <P>
        第177条と第162条が6回も同じ問題に出ているのは、<strong>時効と登記</strong>という論点があるからです。
        時効が完成したあとに現れた第三者との関係は対抗問題になり、登記が必要になります。
        ここを問うと、必然的に177条と162条の両方が根拠条文になります。
      </P>
      <P>
        同じことが第899条の2との組み合わせにも言えます。こちらは<strong>相続と登記</strong>の論点です。
        相続による権利の承継を第三者に対抗するには、法定相続分を超える部分について対抗要件を備える必要があります。
        ここでも177条と899条の2が同時に出てきます。
      </P>
      <P>
        つまり、<strong>同じ問題で一緒に問われている条文の組み合わせは、多くの場合そのまま論点の名前になっています。</strong>
        条文を1つずつ潰すのではなく、この組み合わせの単位で押さえると効率が上がります。
      </P>

      {/* 7 */}
      <H2>最終目標は「短期間で全体を確認できる状態」</H2>
      <P>
        試験直前に大量の教材を読み直すことはできません。
        普段の勉強から重要な条文と判例を一か所に集約しておき、最終的には
        <strong>重要な条文と判例を1〜2日で一通り確認できる状態</strong>を目指します。
      </P>
      <P>
        前に見たとおり、6年間で2回以上問われた条文は{s.twicePlus}条です。この規模なら、直前期に何度でも回せます。
      </P>

      {/* 8 */}
      <H2>民法は「条文に始まり、条文に終わる」</H2>
      <P>
        最初から六法だけを読んでも、民法はなかなか理解できません。
        まずはテキストや講義で制度を知り、過去問で使い方を覚えます。そして最後に条文と判例へ戻ります。
      </P>
      <P>
        <strong>テキストで知る。問題で気づく。条文と判例で確認する。</strong>
        この繰り返しです。教材を増やし続けるより、最終的な判断根拠を条文と判例に集約する。
        これが、行政書士試験の民法を効率よく学ぶための基本的な考え方です。
      </P>

      <section className="mt-12 border-t border-gray-100 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">条文から確認する</h2>
        <ul className="space-y-2">
          {[
            [`/ranking/${LAW_ID}`, '民法 出題ランキング', `6年間の出題数順に${s.asked}条`],
            [`/law/${LAW_ID}`, '民法 全条文一覧', `${fmt(s.total)}条を出題実績つきで`],
            ['/kouza/gyosei', '行政書士通信講座5社の比較', '独学で行き詰まったら'],
          ].map(([href, title, sub]) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-[60px] items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-800">{title}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{sub}</span>
                </span>
                <span className="shrink-0 text-lg text-gray-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-[11px] leading-5 text-gray-500">
        本ページの出題データは、行政書士試験の過去問（{EXAM_RANGE}）を独自に分析して根拠条文を割り当てたものです。
        公式の集計ではありません。条文は e-Gov 法令検索の法令データにもとづいています。
      </p>
    </main>
  );
}
