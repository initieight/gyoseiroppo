import { buildPart, xmlResponse } from '@/lib/sitemap-parts';

/** 出題実績のある条文ページだけを載せた診断用サイトマップ */
export const dynamic = 'force-static';

export async function GET() {
  return xmlResponse(await buildPart('asked'));
}
