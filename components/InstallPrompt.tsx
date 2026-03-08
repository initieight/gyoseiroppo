'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // すでにインストール済みなら表示しない
    if (isInStandaloneMode()) return;

    // iOS: beforeinstallprompt は発火しないので手動ヒントを表示
    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed) return null;
  if (!deferredPrompt && !showIosHint) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDismissed(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="mt-8 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <span className="mt-0.5 text-lg leading-none" aria-hidden>📲</span>
      <div className="flex-1">
        {showIosHint ? (
          <>
            <p className="font-semibold mb-0.5">ホーム画面に追加できます</p>
            <p className="text-xs text-blue-700 leading-5">
              Safari の共有ボタン（
              <span className="font-mono">⎙</span>
              ）→「ホーム画面に追加」をタップしてください。
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold mb-0.5">ホーム画面に追加</p>
            <p className="text-xs text-blue-700 leading-5 mb-2">
              アプリとしてインストールするとオフラインでも使えます。
            </p>
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              インストール
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="閉じる"
        className="text-blue-400 hover:text-blue-600 transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
