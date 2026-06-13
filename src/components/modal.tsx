"use client";

import { useEffect, useId, useRef } from "react";

/**
 * 共通モーダル。背景クリック / Esc / 閉じる×ボタンで閉じ、開いたら
 * パネル内の最初のフォーカス可能要素へフォーカスを移す。
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  dismissible = true,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  /** 送信中など、閉じさせたくないときは false */
  dismissible?: boolean;
  size?: "md" | "lg";
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

  const maxWidth = size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => dismissible && onClose()}
        className="fixed inset-0 cursor-default bg-ink/40"
      />
      <div
        ref={panelRef}
        className={`relative my-auto w-full ${maxWidth} space-y-4 rounded-lg border border-line bg-surface p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
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
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="-mr-1 -mt-1 shrink-0 rounded p-1 text-xl leading-none text-ink-faint hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
