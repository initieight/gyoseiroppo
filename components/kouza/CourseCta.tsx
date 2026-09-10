import { ctaHref, isLinkReady, AFFILIATE_LINKS, type ProviderId } from '@/lib/kouza';

/**
 * 各社への遷移ボタン。
 * 提携が未承認のあいだ（url が '#'）は、リンクではなく公式サイトへの
 * 通常リンクを出す。承認後に lib/kouza.ts の AFFILIATE_LINKS を差し替えれば
 * 自動で広告リンクに切り替わる。
 */
export default function CourseCta({
  providerId,
  officialUrl,
  name,
}: {
  providerId: ProviderId;
  officialUrl: string;
  name: string;
}) {
  const ready = isLinkReady(providerId);
  const href = ready ? ctaHref(providerId) : officialUrl;
  // A8.net のインプレッション計測タグ。URLは一字も変更しないこと（A8の規約）
  const impression = ready ? AFFILIATE_LINKS[providerId].impression : undefined;

  return (
    <div className="mt-5">
      <a
        href={href}
        target="_blank"
        rel={ready ? 'noopener noreferrer sponsored' : 'noopener noreferrer nofollow'}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-800"
      >
        {name}の公式サイトで最新の価格を見る
        <span aria-hidden>→</span>
      </a>
      {impression && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={impression} width={1} height={1} alt="" style={{ border: 0 }} />
      )}
      <p className="mt-2 text-[11px] leading-5 text-gray-500">
        価格・キャンペーン・制度の内容は変更されることがあります。申し込み前に必ず公式サイトの表示をご確認ください。
        {ready && <>（このリンクは広告です）</>}
      </p>
      {!ready && (
        <p className="mt-1 text-[11px] leading-5 text-gray-400">
          {AFFILIATE_LINKS[providerId].label}へのリンクは準備中のため、現在は公式サイトへ直接リンクしています。
        </p>
      )}
    </div>
  );
}
