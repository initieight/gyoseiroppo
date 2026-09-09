import {
  LAWS,
  SITE_URL,
  getLawData,
  getHighlightData,
  sortedArticleKeys,
  isDeletedArticle,
  articleHref,
} from '@/lib/laws';

/**
 * 診断用のサイトマップを組み立てる。
 *
 * 目的はクロール予算の配分ではない（Google はサイトマップ単位で予算を配らず、
 * priority も無視すると明言している）。
 * Search Console で「出題実績のあるページ」と「未出題のページ」の
 * インデックス状況を分けて見られるようにするためのもの。
 *
 * 本体の /sitemap.xml は全URLを載せたまま変更しない。
 */
export type Part = 'asked' | 'unasked';

export async function buildPart(part: Part): Promise<string> {
  const now = new Date().toISOString();
  const urls: string[] = [];

  for (const law of LAWS) {
    const [lawData, hl] = await Promise.all([getLawData(law.id), getHighlightData(law.id)]);
    for (const key of sortedArticleKeys(lawData)) {
      const art = lawData.articles[key];
      if (isDeletedArticle(art)) continue;
      const asked = (hl.articles?.[key]?.count ?? 0) > 0;
      if ((part === 'asked') !== asked) continue;
      urls.push(`${SITE_URL}${articleHref(law.id, key)}`);
    }
  }

  if (urls.length < 100) {
    throw new Error(
      `診断用サイトマップ(${part})のURLが ${urls.length} 件しかありません。` +
      'データの読み込みに失敗している可能性があります。',
    );
  }

  const body = urls
    .map(u => `<url><loc>${u}</loc><lastmod>${now}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
