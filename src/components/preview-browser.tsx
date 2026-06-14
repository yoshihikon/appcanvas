"use client";

import { useMemo, useRef, useState } from "react";
import { deviceAspectClass, deviceLabel } from "@/lib/device";

type PreviewScreen = {
  id: string;
  name: string;
  device: string;
  groupName: string;
  hasPreview: boolean;
};

const UNGROUPED = "";

/**
 * プレビュータブ。左にプレビュー用HTML（画面名）の一覧、右にiframeプレビュー。
 * iframe内で別画面へ遷移すると左の選択も追従する（同一オリジンのlocationを読む）。
 */
export function PreviewBrowser({
  projectId,
  screens,
}: {
  projectId: string;
  screens: PreviewScreen[];
}) {
  const firstId =
    screens.find((s) => s.hasPreview)?.id ?? screens[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstId);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const groups = useMemo(() => {
    const map = new Map<string, PreviewScreen[]>();
    for (const s of screens) {
      const key = s.groupName || UNGROUPED;
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return [...map.entries()];
  }, [screens]);

  const selected = screens.find((s) => s.id === selectedId) ?? null;

  // iframe内のプレビューが別画面に遷移したら選択を追従させる
  function handleIframeLoad() {
    try {
      const pathname = iframeRef.current?.contentWindow?.location.pathname;
      if (!pathname) return;
      const m = pathname.match(/^\/preview\/[^/]+\/([^/]+)\/?$/);
      const sid = m?.[1];
      if (sid && sid !== selectedId && screens.some((s) => s.id === sid)) {
        setSelectedId(sid);
      }
    } catch {
      // クロスオリジン等で読めない場合は何もしない
    }
  }

  if (screens.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface/60 px-8 py-16 text-center">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-faint">
          NO SCREENS
        </p>
        <p className="mt-3 text-ink-soft">
          まだ画面がありません。画面一覧タブで画面を生成してください。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      {/* 左: プレビューHTML一覧 */}
      <aside className="rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-3 py-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
            PREVIEW HTML
          </span>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-2">
          {groups.map(([group, list]) => (
            <div key={group || "__ungrouped"}>
              <p className="px-2 py-1 font-mono text-[10px] tracking-wider text-ink-faint">
                {group || "未分類"}
              </p>
              <ul>
                {list.map((s) => {
                  const active = s.id === selectedId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                          active
                            ? "bg-accent-soft text-accent"
                            : "text-ink-soft hover:bg-paper hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] tracking-wider text-ink-faint">
                          {deviceLabel(s.device)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* 右: プレビュー */}
      <section className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span className="truncate text-sm font-semibold">
            {selected?.name ?? "—"}
          </span>
          {selected && (
            <span className="font-mono text-[10px] tracking-wider text-ink-faint">
              {deviceLabel(selected.device)}
            </span>
          )}
        </div>
        <div className="bg-paper/60 p-4">
          {selected ? (
            <iframe
              ref={iframeRef}
              title={`${selected.name} のプレビュー`}
              src={`/preview/${projectId}/${selected.id}`}
              onLoad={handleIframeLoad}
              className={`mx-auto w-full rounded border border-line bg-surface ${
                selected.device === "mobile" ? "max-w-[390px]" : ""
              } ${deviceAspectClass(selected.device)}`}
            />
          ) : (
            <p className="py-16 text-center text-sm text-ink-soft">
              画面を選択してください。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
