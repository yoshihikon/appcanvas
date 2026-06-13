"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Screen } from "@/lib/db/schema";
import { StatusBadge } from "@/components/status-badge";

const UNGROUPED = "";

/**
 * プロジェクトキャンバス。
 * 自由配置はせず、グループ（行のまとまり）× 固定格子で画面を整列させる。
 */
export function Canvas({
  projectId,
  screens,
}: {
  projectId: string;
  screens: Screen[];
}) {
  // sortOrder昇順で渡される前提。グループの出現順を保ったまままとめる
  const groups = new Map<string, Screen[]>();
  for (const screen of screens) {
    const key = screen.groupName || UNGROUPED;
    const list = groups.get(key);
    if (list) {
      list.push(screen);
    } else {
      groups.set(key, [screen]);
    }
  }
  if (groups.size === 0) groups.set(UNGROUPED, []);

  // 画面番号（SCR-xx）は全画面通しの並び順で振る
  const numberById = new Map(screens.map((s, i) => [s.id, i + 1]));

  return (
    <div className="canvas-grid space-y-8 rounded-lg border border-line bg-surface/50 p-6">
      {[...groups.entries()].map(([groupName, groupScreens]) => (
        <section key={groupName || "__ungrouped"}>
          <h2 className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-ink-soft">
            <span aria-hidden className="h-px w-4 bg-ink-faint" />
            {groupName || "未分類"}
            <span className="text-ink-faint">({groupScreens.length})</span>
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {groupScreens.map((screen) => (
              <li key={screen.id}>
                <ScreenCard
                  projectId={projectId}
                  screen={screen}
                  number={numberById.get(screen.id) ?? 0}
                />
              </li>
            ))}
            <li>
              <AddScreenTile projectId={projectId} groupName={groupName} />
            </li>
          </ul>
        </section>
      ))}
      <NewGroupForm projectId={projectId} />
    </div>
  );
}

function ScreenCard({
  projectId,
  screen,
  number,
}: {
  projectId: string;
  screen: Screen;
  number: number;
}) {
  return (
    <Link
      href={`/projects/${projectId}/screens/${screen.id}`}
      className="group block overflow-hidden rounded-md border border-line bg-surface shadow-sm transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="relative aspect-[4/3] border-b border-line bg-paper">
        {screen.thumbnailPath ? (
          // サムネイル配信APIはM2のキャプチャ実装と合わせて追加する
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/projects/${projectId}/screens/${screen.id}/thumbnail`}
            alt=""
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="canvas-grid flex size-full items-center justify-center">
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
              {screen.status === "generating" ? "GENERATING…" : "NO PREVIEW"}
            </span>
          </div>
        )}
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
    </Link>
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
