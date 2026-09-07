'use client';

import { useState } from 'react';

/** 出題箇所リスト（クリックで本文中のハイライトへスクロール） */
export function PhraseJumpList({ phrases }: { phrases: string[] }) {
  if (phrases.length === 0) return null;

  const jumpTo = (idx: number) => {
    document.getElementById(`hl-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="mb-6 p-3 border rounded-lg bg-gray-50">
      <h2 className="text-sm font-semibold mb-2 text-gray-700">
        出題箇所（タップで本文へジャンプ）
      </h2>
      <ol className="space-y-1 list-decimal pl-5">
        {phrases.map((p, i) => (
          <li key={`${i}-${p}`}>
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline text-left py-1.5 leading-6"
              onClick={() => jumpTo(i)}
            >
              {p}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 要件・効果ハイライトの凡例（開閉） */
export function LegendToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="text-xs text-gray-500 hover:text-gray-700 underline decoration-dotted py-2"
      >
        {open ? '▲ 凡例を閉じる' : '▼ ハイライトの見方'}
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-lg border bg-gray-50 text-xs text-gray-700 leading-6 space-y-1">
          <p>
            <span className="seg-req px-1 rounded">黄色下線</span> ＝ 要件（条件・前提）
          </p>
          <p>
            <span className="seg-eff px-1 rounded">緑色下線</span> ＝ 効果（義務・権限・法律効果）
          </p>
          <p className="text-gray-400 text-[11px]">
            ※ 自動抽出のため誤検出あり。記述答案では条文どおりの表現が無難です。
          </p>
        </div>
      )}
    </div>
  );
}
