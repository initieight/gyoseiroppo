import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/laws';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 生データJSON（ページではない）を検索結果に出さない。
        // 旧 /admin_procedure は noindex メタで対応するため、ここでブロックしない
        // （ブロックすると noindex を読んでもらえず、URLだけ残り続けるため）。
        disallow: ['/laws/', '/highlights/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
