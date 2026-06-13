"use client";

import { useEffect, useId, useRef } from "react";

/**
 * 共通モーダル。背景クリック / Esc/ で閉じ、開いたらパネル内の
 * 最初のフォーカス可能要素へフォーカスを移す。
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  /** 送信中など、閉じさせたくないときは false */
  dismissible?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLElement>(
        'input, textarea, button, [tabindex]:not([tabindex="-1"])',
      )
      ?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => dismissible && onClose()}
        className="absolute inset-0 cursor-default bg-ink/40"
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-md space-y-4 rounded-lg border border-line bg-surface p-6 shadow-xl"
      >
        <div>
          {eyebrow && (
            <p className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
              {eyebrow}
            </p>
          )}
          <h2 id={titleId} className="mt-1 text-lg font-bold">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
