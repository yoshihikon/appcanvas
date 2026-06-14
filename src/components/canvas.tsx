"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Screen } from "@/lib/db/schema";
import { deviceAspectClass, deviceLabel } from "@/lib/device";
import { StatusBadge } from "@/components/status-badge";
import { CanvasToolbar } from "@/components/canvas-toolbar";

const UNGROUPED = "";

type Group = { name: string; screens: Screen[] };

/**
 * プロジェクトの画面一覧。自由配置はせず、グループ × 固定格子で整列。
 * サムネイルはドラッグして並び替え・別グループへの移動ができる。
 */
export function Canvas({
  projectId,
  screens,
  defaultDevice,
}: {
  projectId: string;
  screens: Screen[];
  defaultDevice: string;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>(() => toGroups(screens));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ group: string; beforeId: string | null } | null>(null);

  // サーバー側の変更（追加・生成・削除）に追従して再構築する
  const signature = useMemo(
    () => screens.map((s) => `${s.id}:${s.groupName}:${s.sortOrder}`).join("|"),
    [screens],
  );
  useEffect(() => {
    setGroups(toGroups(screens));
    // signature が変わったときだけ再構築（DnD中の自分の更新では変わらない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const numberById = new Map(
    groups.flatMap((g) => g.screens).map((s, i) => [s.id, i + 1]),
  );

  async function persist(next: Group[]) {
    // sortOrder は全体通し番号で振り直す
    let order = 0;
    const items = next.flatMap((g) =>
      g.screens.map((s) => ({ id: s.id, groupName: g.name, sortOrder: order++ })),
    );
    await fetch(`/api/projects/${projectId}/screens/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    router.refresh();
  }

  function handleDrop(targetGroup: string, beforeId: string | null) {
    if (!draggingId) return;
    const next = moveScreen(groups, draggingId, targetGroup, beforeId);
    setGroups(next);
    setDraggingId(null);
    setDropHint(null);
    void persist(next);
  }

  return (
    <div className="canvas-grid space-y-8 rounded-lg border border-line bg-surface/50 p-6">
      <CanvasToolbar projectId={projectId} defaultDevice={defaultDevice} />

      {groups.map((group) => (
        <section
          key={group.name || "__ungrouped"}
          onDragOver={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            setDropHint({ group: group.name, beforeId: null });
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(group.name, dropHint?.group === group.name ? dropHint.beforeId : null);
          }}
        >
          <h2 className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-ink-soft">
            <span aria-hidden className="h-px w-4 bg-ink-faint" />
            {group.name || "未分類"}
            <span className="text-ink-faint">({group.screens.length})</span>
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.screens.map((screen) => {
              const hinted =
                dropHint?.group === group.name && dropHint.beforeId === screen.id;
              return (
                <li
                  key={screen.id}
                  onDragOver={(e) => {
                    if (!draggingId) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDropHint({ group: group.name, beforeId: screen.id });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(group.name, screen.id);
                  }}
                  className={
                    hinted ? "rounded-md ring-2 ring-accent ring-offset-2" : undefined
                  }
                >
                  <ScreenCard
                    projectId={projectId}
                    screen={screen}
                    number={numberById.get(screen.id) ?? 0}
                    dragging={draggingId === screen.id}
                    onDragStart={() => setDraggingId(screen.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropHint(null);
                    }}
                  />
                </li>
              );
            })}
            <li>
              <AddScreenTile projectId={projectId} groupName={group.name} />
            </li>
          </ul>
        </section>
      ))}

      <NewGroupForm projectId={projectId} />
    </div>
  );
}

function toGroups(screens: Screen[]): Group[] {
  const ordered = [...screens].toSorted((a, b) => a.sortOrder - b.sortOrder);
  const map = new Map<string, Screen[]>();
  for (const s of ordered) {
    const key = s.groupName || UNGROUPED;
    const list = map.get(key);
    if (list) list.push(s);
    else map.set(key, [s]);
  }
  if (map.size === 0) map.set(UNGROUPED, []);
  return [...map.entries()].map(([name, list]) => ({ name, screens: list }));
}

/** dragging を targetGroup の beforeId の前（null なら末尾）へ移動した新しい groups を返す */
function moveScreen(
  groups: Group[],
  draggingId: string,
  targetGroup: string,
  beforeId: string | null,
): Group[] {
  let moved: Screen | undefined;
  let cleaned = groups.map((g) => {
    const idx = g.screens.findIndex((s) => s.id === draggingId);
    if (idx >= 0) {
      moved = g.screens[idx];
      return { ...g, screens: g.screens.filter((s) => s.id !== draggingId) };
    }
    return g;
  });
  if (!moved) return groups;
  const movedScreen: Screen = { ...moved, groupName: targetGroup };

  if (!cleaned.some((g) => g.name === targetGroup)) {
    cleaned = [...cleaned, { name: targetGroup, screens: [] }];
  }
  const result = cleaned.map((g) => {
    if (g.name !== targetGroup) return g;
    const arr = [...g.screens];
    const at = beforeId ? arr.findIndex((s) => s.id === beforeId) : -1;
    arr.splice(at < 0 ? arr.length : at, 0, movedScreen);
    return { ...g, screens: arr };
  });
  // 空になったグループは消す（未分類のみ空でも残す必要はない）
  return result.filter((g) => g.screens.length > 0);
}

function ScreenCard({
  projectId,
  screen,
  number,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  projectId: string;
  screen: Screen;
  number: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const router = useRouter();
  const href = `/projects/${projectId}/screens/${screen.id}`;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", screen.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className={`group block cursor-pointer overflow-hidden rounded-md border border-line bg-surface shadow-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div
        className={`relative ${deviceAspectClass(screen.device)} border-b border-line bg-paper`}
      >
        {screen.thumbnailPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/projects/${projectId}/screens/${screen.id}/thumbnail`}
            alt=""
            draggable={false}
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="canvas-grid flex size-full items-center justify-center">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
              {screen.status === "generating" ? "GENERATING…" : "NO PREVIEW"}
            </span>
          </div>
        )}
        <span className="absolute right-1.5 top-1.5 rounded-sm bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-surface">
          {deviceLabel(screen.device)}
        </span>
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
            SCR-{String(number).padStart(2, "0")}
          </span>
          <StatusBadge status={screen.status} />
        </div>
        <p className="truncate text-sm font-semibold group-hover:text-accent">
          {screen.name}
        </p>
      </div>
    </div>
  );
}

function AddScreenTile({
  projectId,
  groupName,
}: {
  projectId: string;
  groupName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/screens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), groupName }),
      });
      if (res.ok) {
        setName("");
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-ink-faint transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-xs">画面を追加</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex aspect-[4/3] w-full flex-col justify-center gap-2 rounded-md border border-accent bg-surface p-3"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="画面名（例: ログイン画面）"
        aria-label="画面名"
        className="w-full rounded border border-line px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-surface disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName("");
          }}
          className="rounded px-2 py-1.5 text-xs text-ink-soft hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function NewGroupForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [screenName, setScreenName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim() || !screenName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/screens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: screenName.trim(),
          groupName: groupName.trim(),
        }),
      });
      if (res.ok) {
        setGroupName("");
        setScreenName("");
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-xs tracking-wider text-ink-soft underline-offset-4 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
      >
        + グループを追加
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-surface p-3"
    >
      <label className="block">
        <span className="mb-1 block font-mono text-[10px] tracking-wider text-ink-soft">
          グループ名
        </span>
        <input
          autoFocus
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="例: 認証"
          className="w-44 rounded border border-line px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-mono text-[10px] tracking-wider text-ink-soft">
          最初の画面名
        </span>
        <input
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          placeholder="例: ログイン画面"
          className="w-52 rounded border border-line px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>
      <button
        type="submit"
        disabled={submitting || !groupName.trim() || !screenName.trim()}
        className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        作成
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded px-2 py-1.5 text-sm text-ink-soft hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
      >
        キャンセル
      </button>
    </form>
  );
}
