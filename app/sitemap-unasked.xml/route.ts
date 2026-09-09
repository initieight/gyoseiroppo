import { buildPart, xmlResponse } from '@/lib/sitemap-parts';

/** 未出題の条文ページだけを載せた診断用サイトマップ */
export const dynamic = 'force-static';

export async function GET() {
  return xmlResponse(await buildPart('unasked'));
}
