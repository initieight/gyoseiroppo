'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface LawArticle {
  title: string;
  caption?: string;
  text: string;
}

interface LawData {
  lawId: string;
  articles: Record<string, LawArticle>;
}

interface HighlightArticle {
  count: number;
  years: string[];
  phrases: string[];
}

interface HighlightData {
  lawId: string;
  range: string[];
  articles: Record<string, HighlightArticle>;
}

const LAW_NAMES: Record<string, string> = {
  constitution:       '憲法',
  civil_code:         '民法',
  commercial_code:    '商法',
  company_act:        '会社法',
  admin_procedure:    '行政手続法',
  admin_appeal:       '行政不服審査法',
  admin_litigation:   '行政事件訴訟法',
  state_liability:    '国家賠償法',
  admin_enforcement:  '行政代執行法',
  national_admin_org: '国家行政組織法',
  local_autonomy:     '地方自治法',
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function starLabel(count: number): string {
  if (count <= 0) return '';
  return '★'.repeat(Math.min(count, 3));
}

/** 404 でも落ちない fetch。失敗時は fallback を返す */
async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    return r.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

/**
 * 出題フレーズを本文にハイライト適用する。
 *
 * 表示順（ジャンプメニュー）:
 *   rawText.indexOf(phrase) で出現位置を取り、昇順ソート。
 *   → 条文を上から読んだ順に並ぶ。見つからないフレーズは末尾。
 *
 * HTML 置換順:
 *   長いフレーズ優先（短い部分文字列が先に置換されて崩れるのを防ぐ）。
 *
 * id 付与:
 *   position-sorted の displayList インデックスで付与。
 *   同じフレーズが複数回出現しても最初の 1 箇所だけ id を付ける（id 重複防止）。
 */
function applyHighlightsWithAnchors(rawText: string, phrases: string[]) {
  const cleaned = (phrases ?? []).map(p => (p ?? '').trim()).filter(p => p.length > 0);
  const unique = Array.from(new Set(cleaned));

  // 条文内の出現位置で並べる（見つからない → MAX → 末尾）
  const withPos = unique.map((p, idx) => ({
    p,
    pos: rawText.indexOf(p) === -1 ? Number.MAX_SAFE_INTEGER : rawText.indexOf(p),
    idx,
  }));
  withPos.sort((a, b) => (a.pos !== b.pos ? a.pos - b.pos : a.idx - b.idx));

  const displayList = withPos.map(x => x.p);

  // HTMLエスケープしてから置換
  let html = escHtml(rawText);

  // ① 全フレーズをハイライト（idなし）。長い順に置換して部分一致崩れ防止
  const replaceOrder = [...displayList].sort((a, b) => b.length - a.length);
  for (const phrase of replaceOrder) {
    const escaped = escHtml(phrase);
    if (!escaped || !html.includes(escaped)) continue;
    html = html.split(escaped).join(`<span class="hl">${escaped}</span>`);
  }

  // ② displayList 順に id を付与（最初の1箇所のみ）
  for (let i = 0; i < displayList.length; i++) {
    const escaped = escHtml(displayList[i]);
    const token = `<span class="hl">${escaped}</span>`;
    const tokenWithId = `<span class="hl" id="hl-${i}">${escaped}</span>`;
    if (!escaped || !html.includes(token)) continue;
    html = html.replace(token, tokenWithId); // String.replace は最初の1箇所だけ
  }

  html = html.replace(/\n/g, '<br>');
  return { html, displayList };
}

export default function ArticlePage() {
  const params = useParams();
  const lawId = (params.lawId as string) ?? '';
  const articleKey = decodeURIComponent((params.article as string) ?? '');

  const [lawArticle, setLawArticle] = useState<LawArticle | null>(null);
  const [highlight, setHighlight] = useState<HighlightArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lawId || !articleKey) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const emptyHl: HighlightData = { lawId, range: [], articles: {} };

    Promise.all([
      fetch(`/laws/${lawId}.json`, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error(`laws/${lawId}.json が見つかりません (${r.status})`);
        return r.json() as Promise<LawData>;
      }),
      fetchJson<HighlightData>(`/highlights/r2_r7_${lawId}.json`, emptyHl),
    ])
      .then(([lawData, hlData]) => {
        if (cancelled) return;

        const art = lawData.articles?.[articleKey];
        if (!art) {
          setError(`${articleKey} のデータが見つかりません`);
          return;
        }

        setLawArticle(art);
        setHighlight(hlData.articles?.[articleKey] ?? null);
      })
      .catch(e => {
        if (cancelled) return;
        setError((e as Error).message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lawId, articleKey]);

  const count = highlight?.count ?? 0;
  const years = highlight?.years ?? [];
  const phrases = highlight?.phrases ?? [];

  const { highlightedHtml, displayPhrases } = useMemo(() => {
    if (!lawArticle) return { highlightedHtml: '', displayPhrases: [] as string[] };
    const { html, displayList } = applyHighlightsWithAnchors(lawArticle.text ?? '', phrases);
    return { highlightedHtml: html, displayPhrases: displayList };
  }, [lawArticle, phrases]);

  const jumpTo = (idx: number) => {
    document.getElementById(`hl-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;
  if (error || !lawArticle) return <div className="p-6 text-red-500">{error ?? '条文が見つかりません'}</div>;

  const lawName = LAW_NAMES[lawId] ?? lawId;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* ナビ */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href={`/law/${lawId}`} className="text-sm text-blue-600 hover:underline">
          ← 条文一覧へ
        </Link>
        <Link href={`/ranking/${lawId}`} className="text-sm text-blue-600 hover:underline">
          ランキングへ →
        </Link>
      </div>

      <div className="mb-1 text-xs text-gray-400 uppercase tracking-wide">{lawName}</div>

      <h1 className="text-xl font-bold text-gray-800 mb-0.5">{lawArticle.title}</h1>

      {lawArticle.caption ? (
        <p className="text-sm text-gray-500 mb-4">{lawArticle.caption}</p>
      ) : (
        <div className="mb-4" />
      )}

      {/* 出題情報 */}
      {count > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-yellow-500 font-bold text-base" title={`R2〜R7 出題${count}回`}>
            {starLabel(count)}
          </span>
          <span className="text-xs text-gray-500">出題{count}回</span>
          {years.map(y => (
            <span
              key={y}
              className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium"
            >
              {y}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <span className="text-xs text-gray-500">未出題（R2〜R7範囲）</span>
        </div>
      )}

      {/* 出題箇所ジャンプ（条文内の出現順） */}
      {displayPhrases.length > 0 && (
        <div className="mb-6 p-3 border rounded-lg bg-gray-50">
          <div className="text-sm font-semibold mb-2 text-gray-700">出題箇所（クリックでジャンプ）</div>
          <ol className="space-y-1 list-decimal pl-5">
            {displayPhrases.map((p, i) => (
              <li key={`${i}-${p}`}>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline text-left"
                  onClick={() => jumpTo(i)}
                >
                  {p}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 条文本文 */}
      <div
        className="text-sm leading-8 text-gray-800"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </main>
  );
}
