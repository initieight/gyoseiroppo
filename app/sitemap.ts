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

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,    lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/law`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
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

  return entries;
}
