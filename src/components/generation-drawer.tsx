"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEVICE_OPTIONS, type DeviceType } from "@/lib/device";
import type { AgentMessage, Proposal, ProposedScreen } from "@/lib/generation/types";

type Msg = { role: string; message: AgentMessage };

/**
 * AI画面生成の右ドロワー（docs/AI-GENERATION.md §2.1）。
 * SSEでClaude Codeとのやりとりを受け取り、構成案レビュー→承認→順次生成を
 * 1つのパネルで進める。左のキャンバスにサムネが順次反映される。
 */
export function GenerationDrawer({
  projectId,
  runId,
  onClose,
}: {
  projectId: string;
  runId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("proposing");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [progress, setProgress] = useState<
    { screenId: string; name: string; status: string }[]
  >([]);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // SSE 購読
  useEffect(() => {
    const es = new EventSource(
      `/api/projects/${projectId}/generations/${runId}/stream`,
    );
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      switch (ev.type) {
        case "snapshot":
          setStatus(ev.status);
          if (ev.proposal) setProposal(ev.proposal);
          setMessages(ev.messages ?? []);
          // 再接続時に進捗を復元する
          if (Array.isArray(ev.screens)) setProgress(ev.screens);
          break;
        case "message":
          setMessages((prev) => [...prev, { role: ev.role, message: ev.message }]);
          break;
        case "phase":
          setStatus(ev.status);
          break;
        case "proposal":
          setProposal(ev.proposal);
          break;
        case "screen":
          // 既存項目はその場で更新し、並び順を保つ
          setProgress((prev) => {
            const idx = prev.findIndex((p) => p.screenId === ev.screenId);
            const next = { screenId: ev.screenId, name: ev.name, status: ev.status };
            if (idx === -1) return [...prev, next];
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          });
          // 画面が完成した時だけキャンバスを更新（生成中は再取得しない）
          if (ev.status === "generated" || ev.status === "error") router.refresh();
          break;
        case "done":
          setStatus("done");
          router.refresh();
          break;
        case "error":
          setStatus("error");
          setMessages((prev) => [
            ...prev,
            { role: "system", message: { kind: "notice", text: ev.message } },
          ]);
          break;
      }
    };
    es.onerror = () => {
      /* 終了時にサーバーが閉じると発火する。状態は phase/done で管理済み */
    };
    return () => es.close();
  }, [projectId, runId, router]);

  // 新着メッセージで最下部へ
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function updateScreen(idx: number, patch: Partial<ProposedScreen>) {
    setProposal((p) =>
      p
        ? { screens: p.screens.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
        : p,
    );
  }
  function removeScreen(idx: number) {
    setProposal((p) => (p ? { screens: p.screens.filter((_, i) => i !== idx) } : p));
  }
  function addScreen() {
    setProposal((p) => ({
      screens: [
        ...(p?.screens ?? []),
        {
          key: `screen-${(p?.screens.length ?? 0) + 1}`,
          name: "新しい画面",
          group: "",
          device: "desktop",
          description: "",
          include: true,
        },
      ],
    }));
  }

  async function post(path: string, body: object) {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/generations/${runId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } finally {
      setBusy(false);
    }
  }

  const includedCount = proposal?.screens.filter((s) => s.include).length ?? 0;

  return (
    <div className="fixed inset-y-0 right-0 top-12 z-40 flex w-full max-w-[440px] flex-col border-l border-line bg-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full bg-accent" />
          <span className="font-mono text-xs tracking-[0.2em] text-ink-faint">
            {phaseLabel(status)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="rounded p-1 text-xl leading-none text-ink-faint hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          ×
        </button>
      </div>

      {/* やりとり */}
      <div ref={logRef} className="max-h-[40%] shrink-0 space-y-2 overflow-y-auto border-b border-line p-4">
        {messages.length === 0 && (
          <p className="text-sm text-ink-faint">やりとりがここに表示されます。</p>
        )}
        {messages.map((m, i) => (
          <MessageRow key={i} role={m.role} message={m.message} />
        ))}
        {(status === "proposing" || status === "generating") && (
          <p className="animate-pulse font-mono text-xs text-accent">…</p>
        )}
      </div>

      {/* フェーズ別の操作 */}
      <div className="flex-1 overflow-y-auto p-4">
        {status === "reviewing" && proposal && (
          <ReviewPanel
            proposal={proposal}
            busy={busy}
            onUpdate={updateScreen}
            onRemove={removeScreen}
            onAdd={addScreen}
            instruction={instruction}
            onInstruction={setInstruction}
            onRevise={() => {
              if (!instruction.trim()) return;
              const text = instruction;
              setInstruction("");
              post("revise", { instruction: text, proposal });
            }}
            onApprove={() => post("approve", { proposal })}
            includedCount={includedCount}
          />
        )}

        {status === "generating" && (
          <ProgressPanel progress={progress} total={includedCount} />
        )}

        {(status === "done" || status === "canceled") && (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              {status === "done" ? "生成が完了しました。" : "中断しました。"}
            </p>
            <ProgressPanel progress={progress} total={progress.length} />
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink/85"
            >
              閉じる
            </button>
          </div>
        )}

        {status === "error" && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-line px-4 py-2 text-sm text-ink-soft hover:border-ink-faint"
          >
            閉じる
          </button>
        )}
      </div>

      {/* 進行中は中断可能 */}
      {(status === "proposing" || status === "generating") && (
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => post("cancel", {})}
            disabled={busy}
            className="rounded border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-danger hover:text-danger disabled:opacity-50"
          >
            中断
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewPanel({
  proposal,
  busy,
  onUpdate,
  onRemove,
  onAdd,
  instruction,
  onInstruction,
  onRevise,
  onApprove,
  includedCount,
}: {
  proposal: Proposal;
  busy: boolean;
  onUpdate: (idx: number, patch: Partial<ProposedScreen>) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
  instruction: string;
  onInstruction: (v: string) => void;
  onRevise: () => void;
  onApprove: () => void;
  includedCount: number;
}) {
  return (
    <div className="space-y-4">
      <p className="font-mono text-xs tracking-wider text-ink-soft">
        構成案（{includedCount}画面を生成）
      </p>
      <ul className="space-y-2">
        {proposal.screens.map((s, i) => (
          <li
            key={i}
            className={`rounded-md border p-2.5 ${
              s.include ? "border-line" : "border-line/60 bg-paper/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.include}
                onChange={(e) => onUpdate(i, { include: e.target.checked })}
                className="accent-accent"
                aria-label="生成対象"
              />
              <span
                className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-wider ${
                  s.screenId
                    ? "bg-accent-soft text-accent"
                    : "bg-ok-soft text-ok"
                }`}
              >
                {s.screenId ? "更新" : "新規"}
              </span>
              <input
                value={s.name}
                onChange={(e) => onUpdate(i, { name: e.target.value })}
                className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="削除"
                className="shrink-0 rounded px-1.5 text-ink-faint hover:bg-danger-soft hover:text-danger"
              >
                🗑
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={s.group}
                onChange={(e) => onUpdate(i, { group: e.target.value })}
                placeholder="グループ"
                className="w-28 rounded border border-line px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-accent"
              />
              <select
                value={s.device}
                onChange={(e) => onUpdate(i, { device: e.target.value as DeviceType })}
                className="rounded border border-line px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-accent"
              >
                {DEVICE_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            {s.description && (
              <p className="mt-1.5 text-xs text-ink-soft">{s.description}</p>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        className="font-mono text-xs tracking-wider text-ink-soft hover:text-accent"
      >
        ＋画面を追加
      </button>

      <div className="space-y-2 border-t border-line pt-3">
        <textarea
          value={instruction}
          onChange={(e) => onInstruction(e.target.value)}
          rows={2}
          placeholder="追加で指示（例: 決済画面は不要 / 管理者画面も追加）"
          className="w-full rounded border border-line px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onRevise}
            disabled={busy || !instruction.trim()}
            className="rounded border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-ink-faint disabled:opacity-50"
          >
            指示して再検討
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy || includedCount === 0}
            className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50"
          >
            この内容で作成
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressPanel({
  progress,
  total,
}: {
  progress: { screenId: string; name: string; status: string }[];
  total: number;
}) {
  const done = progress.filter((p) => p.status === "generated").length;
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs tracking-wider text-ink-soft">
        {done} / {total} 完了
      </p>
      <ul className="space-y-1">
        {progress.map((p) => (
          <li key={p.screenId} className="flex items-center gap-2 text-sm">
            <span aria-hidden>
              {p.status === "generated" ? "✓" : p.status === "error" ? "⚠" : "◐"}
            </span>
            <span className="truncate">{p.name}</span>
            <span className="ml-auto font-mono text-[10px] tracking-wider text-ink-faint">
              {p.status === "generated"
                ? "生成済み"
                : p.status === "error"
                  ? "エラー"
                  : "生成中…"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageRow({ role, message }: { role: string; message: AgentMessage }) {
  if (message.kind === "tool") {
    return (
      <p className="font-mono text-xs text-ink-faint">
        〔{message.tool}〕 {message.detail}
      </p>
    );
  }
  if (message.kind === "notice") {
    return <p className="text-xs text-danger">{message.text}</p>;
  }
  return (
    <p
      className={`text-sm ${role === "user" ? "text-ink" : "text-ink-soft"}`}
    >
      {role === "user" && (
        <span className="mr-1 font-mono text-[10px] tracking-wider text-ink-faint">
          あなた:
        </span>
      )}
      {message.text}
    </p>
  );
}

function phaseLabel(status: string): string {
  switch (status) {
    case "proposing":
      return "構成を検討中";
    case "reviewing":
      return "構成案の確認";
    case "generating":
      return "画面を生成中";
    case "done":
      return "完了";
    case "canceled":
      return "中断";
    case "error":
      return "エラー";
    default:
      return status.toUpperCase();
  }
}
