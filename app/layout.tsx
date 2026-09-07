import type { Metadata, Viewport } from 'next';
import { SITE_NAME, SITE_URL, EXAM_RANGE } from '@/lib/laws';
import Analytics from '@/components/Analytics';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}｜行政書士試験の出題条文がわかる無料Web六法`,
    template: `%s｜${SITE_NAME}`,
  },
  description:
    `行政書士試験の過去問（${EXAM_RANGE}）から抽出した出題条文を、条文本文と一緒に表示する無料のWeb六法。` +
    '憲法・行政法・民法・商法・会社法の条文ごとに出題回数と出題年度、出題ランキングを確認できます。',
  applicationName: SITE_NAME,
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  // Search Console の HTML タグ認証用。
  // Vercel の環境変数 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION にトークンを入れると出力される。
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME}｜行政書士試験の出題条文がわかる無料Web六法`,
    description: `行政書士試験の過去問（${EXAM_RANGE}）の出題条文・出題回数・出題ランキングを条文ごとに表示する無料Web六法。`,
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME}｜行政書士試験の出題条文がわかる無料Web六法`,
    description: `行政書士試験の過去問（${EXAM_RANGE}）の出題条文・出題回数・出題ランキングを条文ごとに表示する無料Web六法。`,
  },
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
