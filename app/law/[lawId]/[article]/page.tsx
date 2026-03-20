'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ── 型定義 ────────────────────────────────────────────────────
interface Segment {
  type: 'req' | 'eff' | 'plain';
  text: string;
}

interface LawArticle {
  title: string;
  caption?: string;
  text: string;
  segments?: Segment[];   // 民法のみ: 要件・効果セグメント
  note?: string;          // 民法のみ: 試験傾向注記
}

interface LawData {
  lawId: string;
  articles: Record<string, LawArticle>;
}

interface HighlightArticle {
  count: number;
  years: string[];
  phrases: string[];
  questions?: string[];
}

interface HighlightData {
  lawId: string;
  range: string[];
  articles: Record<string, HighlightArticle>;
}

// ── 定数 ──────────────────────────────────────────────────────
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

// ── ユーティリティ ────────────────────────────────────────────
function starLabel(count: number): string {
  if (count <= 0) return '';
  return '★'.repeat(Math.min(count, 3));
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    return r.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── フォールバック用: フレーズハイライト（民法以外の法律）────
function applyPhrasesWithAnchors(rawText: string, phrases: string[]) {
  const cleaned = (phrases ?? []).map(p => (p ?? '').trim()).filter(p => p.length > 0);
  const unique = Array.from(new Set(cleaned));
  const withPos = unique
    .map((p, idx) => ({ p, pos: rawText.indexOf(p) === -1 ? Number.MAX_SAFE_INTEGER : rawText.indexOf(p), idx }))
    .sort((a, b) => a.pos !== b.pos ? a.pos - b.pos : a.idx - b.idx);
  const displayList = withPos.map(x => x.p);
  let html = escHtml(rawText);
  const replaceOrder = [...displayList].sort((a, b) => b.length - a.length);
  for (const phrase of replaceOrder) {
    const esc = escHtml(phrase);
    if (!esc || !html.includes(esc)) continue;
    html = html.split(esc).join(`<span class="hl">${esc}</span>`);
  }
  for (let i = 0; i < displayList.length; i++) {
    const esc = escHtml(displayList[i]);
    const token = `<span class="hl">${esc}</span>`;
    if (!esc || !html.includes(token)) continue;
    html = html.replace(token, `<span class="hl" id="hl-${i}">${esc}</span>`);
  }
  html = html.replace(/\n/g, '<br>');
  return { html, displayList };
}

// ── 要件・効果セグメントをHTMLに変換 ─────────────────────────
function segmentsToHtml(segments: Segment[]): string {
  return segments.map(seg => {
    const t = escHtml(seg.text);
    if (seg.type === 'req') return `<span class="seg-req">${t}</span>`;
    if (seg.type === 'eff') return `<span class="seg-eff">${t}</span>`;
    // plain: 改行を<br>に変換
    return t.replace(/\n/g, '<br>');
  }).join('');
}

// ── メインコンポーネント ──────────────────────────────────────
export default function ArticlePage() {
  const params = useParams();
  const lawId = (params.lawId as string) ?? '';
  const articleKey = decodeURIComponent((params.article as string) ?? '');

  const [lawArticle, setLawArticle]   = useState<LawArticle | null>(null);
  const [highlight, setHighlight]     = useState<HighlightArticle | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showLegend, setShowLegend]   = useState(false);

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
        if (!art) { setError(`${articleKey} のデータが見つかりません`); return; }
        setLawArticle(art);
        setHighlight(hlData.articles?.[articleKey] ?? null);
      })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [lawId, articleKey]);

  const count     = highlight?.count ?? 0;
  const years     = highlight?.years ?? [];
  const phrases   = highlight?.phrases ?? [];
  const questions = highlight?.questions ?? [];

  const isCivilCode = lawId === 'civil_code';
  const hasSegments = isCivilCode && (lawArticle?.segments?.length ?? 0) > 0;
  const hasNote     = isCivilCode && !!lawArticle?.note;

  // HTMLを構築（民法: segmentsベース / その他: フレーズハイライト）
  const { articleHtml, displayPhrases } = useMemo(() => {
    if (!lawArticle) return { articleHtml: '', displayPhrases: [] as string[] };
    if (hasSegments) {
      return { articleHtml: segmentsToHtml(lawArticle.segments!), displayPhrases: [] };
    }
    const { html, displayList } = applyPhrasesWithAnchors(lawArticle.text ?? '', phrases);
    return { articleHtml: html, displayPhrases: displayList };
  }, [lawArticle, phrases, hasSegments]);

  const jumpTo = (idx: number) => {
    document.getElementById(`hl-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>;
  if (error || !lawArticle) return <div className="p-6 text-red-500">{error ?? '条文が見つかりません'}</div>;

  const lawName = LAW_NAMES[lawId] ?? lawId;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* ── CSS ─────────────────────────────────────────────── */}
      <style>{`
        /* 既存のフレーズハイライト */
        .hl { background: #fef08a; border-radius: 2px; padding: 0 1px; }

        /* 民法: 要件（黄）・効果（緑）ハイライト */
        .seg-req {
          background: #fef9c3;
          border-bottom: 2px solid #eab308;
          border-radius: 2px;
          padding: 0 1px;
        }
        .seg-eff {
          background: #dcfce7;
          border-bottom: 2px solid #16a34a;
          border-radius: 2px;
          padding: 0 1px;
        }
      `}</style>

      {/* ── ナビ ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href={`/law/${lawId}`} className="text-sm text-blue-600 hover:underline">
          ← 条文一覧へ
        </Link>
        <Link href={`/ranking/${lawId}`} className="text-sm text-blue-600 hover:underline">
          ランキングへ →
        </Link>
      </div>

      {/* ── タイトル ────────────────────────────────────────── */}
      <div className="mb-1 text-xs text-gray-400 uppercase tracking-wide">{lawName}</div>
      <h1 className="text-xl font-bold text-gray-800 mb-0.5">{lawArticle.title}</h1>
      {lawArticle.caption
        ? <p className="text-sm text-gray-500 mb-4">{lawArticle.caption}</p>
        : <div className="mb-4" />
      }

      {/* ── 出題情報 ────────────────────────────────────────── */}
      {count > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-yellow-500 font-bold text-base" title={`R2〜R7 出題${count}回`}>
            {starLabel(count)}
          </span>
          <span className="text-xs text-gray-500">出題{count}回</span>
          {years.map(y => (
            <span key={y} className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium">
              {y}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <span className="text-xs text-gray-500">未出題（R2〜R7範囲）</span>
        </div>
      )}

      {/* ── 出題問題番号（民法のみ） ────────────────────────── */}
      {isCivilCode && questions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {questions.map(q => (
            <span key={q} className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
              {q}
            </span>
          ))}
        </div>
      )}

      {/* ── 試験傾向注記（民法のみ） ────────────────────────── */}
      {hasNote && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-5">
          <span className="font-semibold">📌 試験傾向：</span>{lawArticle.note}
        </div>
      )}

      {/* ── 要件・効果 凡例（民法のみ） ────────────────────── */}
      {hasSegments && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setShowLegend(v => !v)}
            className="text-xs text-gray-500 hover:text-gray-700 underline decoration-dotted"
          >
            {showLegend ? '▲ 凡例を閉じる' : '▼ ハイライトの見方'}
          </button>
          {showLegend && (
            <div className="mt-2 p-3 rounded-lg border bg-gray-50 text-xs text-gray-700 leading-6 space-y-1">
              <p>
                <span className="seg-req px-1 rounded">黄色下線</span>
                {' '}＝ 要件（条件・前提）
              </p>
              <p>
                <span className="seg-eff px-1 rounded">緑色下線</span>
                {' '}＝ 効果（義務・権限・法律効果）
              </p>
              <p className="text-gray-400 text-[11px]">
                ※ 自動抽出のため誤検出あり。記述答案では条文どおりの表現が無難です。
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 出題箇所ジャンプ（フレーズハイライトのみ） ───── */}
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

      {/* ── 条文本文 ────────────────────────────────────────── */}
      <div
        className="text-sm leading-8 text-gray-800"
        dangerouslySetInnerHTML={{ __html: articleHtml }}
      />

      {/* ── アフィリエイト（控えめ） ────────────────────────── */}
      {isCivilCode && count > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 mb-2">📚 テキストで深掘り（サイト運営費に充てています）</p>
          <a
            href="https://www.amazon.co.jp/s?k=%E8%A1%8C%E6%94%BF%E6%9B%B8%E5%A3%AB+%E6%B0%91%E6%B3%95+%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88&tag=gyoseiroppo-22"
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-block text-xs text-blue-500 hover:underline"
          >
            Amazon で行政書士民法テキストを探す →
          </a>
        </div>
      )}
    </main>
  );
}
