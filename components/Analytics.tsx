import Script from 'next/script';

/**
 * GA4 計測タグ。
 * Vercel の環境変数 NEXT_PUBLIC_GA_ID に測定ID（G-XXXXXXXXXX）を入れると有効になる。
 * 未設定のときは何も出力しない（開発中・プレビューでの計測汚染を防ぐ）。
 */
export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
