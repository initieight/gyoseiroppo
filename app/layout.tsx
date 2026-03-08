import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '行政書士 PWA R7',
  description: '行政書士試験 令和7年度対策',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="theme-color" content="#1e40af" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
