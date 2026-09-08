import type { MetadataRoute } from 'next';
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
 * ビルド時に一度だけ生成する。
 *
 * revalidate を付けてはいけない。ISR にすると Vercel のサーバーレス関数上で
 * 再生成され、そこには public/ のファイルが同梱されないため条文データを
 * 読めず、サイトマップが静かに縮む（実際に 3,343 → 17 になった）。
 */
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,    lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/law`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/kouza/gyosei`,  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/kouza/agaroot`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/kouza/teppan`,  lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  for (const law of LAWS) {
    entries.push({
      url: `${SITE_URL}/law/${law.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    });

    const hl = await getHighlightData(law.id);
    const hasRanking = Object.values(hl.articles ?? {}).some(a => (a?.count ?? 0) > 0);
    if (hasRanking) {
      entries.push({
        url: `${SITE_URL}/ranking/${law.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }

    const lawData = await getLawData(law.id);
    for (const key of sortedArticleKeys(lawData)) {
      const art = lawData.articles[key];
      // 「削除」だけの条文は薄いページなので sitemap に載せない
      if (isDeletedArticle(art)) continue;
      const count = hl.articles?.[key]?.count ?? 0;
      entries.push({
        url: `${SITE_URL}${articleHref(law.id, key)}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: count > 0 ? 0.8 : 0.5,
      });
    }
  }

  // 生成に失敗したまま出荷しないための下限チェック。
  // 条文ページだけで3,000件以上あるはずなので、大きく下回ったらビルドを落とす。
  if (entries.length < 3000) {
    throw new Error(
      `sitemap の生成件数が ${entries.length} 件しかありません。` +
      '条文データの読み込みに失敗している可能性があります（public/laws, public/highlights）。',
    );
  }

  return entries;
}
