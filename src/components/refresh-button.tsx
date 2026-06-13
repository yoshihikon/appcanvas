"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded border border-line px-2 py-1 font-mono text-xs text-ink-soft hover:border-ink-faint hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
    >
      {pending ? "確認中…" : "再確認"}
    </button>
  );
}
