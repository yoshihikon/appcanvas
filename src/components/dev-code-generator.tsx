"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentMessage } from "@/lib/generation/types";

type Msg = { role: string; message: AgentMessage };

/**
 * 開発コードの生成/更新ボタンと進捗ログ。
 * 既存の生成ストリーム（/generations/[runId]/stream）と中断APIを流用する。
 */
export function DevCodeGenerator({
  projectId,
  hasCode,
  generatedScreens,
  onDone,
}: {
  projectId: string;
  hasCode: boolean;
  generatedScreens: number;
  onDone: () => void;
}) {
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(
      `/api/projects/${projectId}/generations/${runId}/stream`,
    );
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      switch (ev.type) {
        case "snapshot":
          setStatus(ev.status);
          setMessages(ev.messages ?? []);
          break;
        case "message":
          setMessages((prev) => [...prev, { role: ev.role, message: ev.message }]);
          break;
        case "phase":
          setStatus(ev.status);
          break;
        case "done":
          setStatus("done");
          onDone();
          break;
        case "error":
          setStatus("error");
          setError(ev.message);
          break;
      }
    };
    es.onerror = () => {};
    return () => es.close();
  }, [projectId, runId, onDone]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  const running = status === "generating" || status === "proposing";

  async function start() {
    setError(null);
    setMessages([]);
    setStatus("generating");
    const res = await fetch(`/api/projects/${projectId}/code-generations`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      setError(data.error ?? "開始に失敗しました");
      return;
    }
    setRunId(data.runId);
  }

  async function cancel() {
    if (!runId) return;
    await fetch(`/api/projects/${projectId}/generations/${runId}/cancel`, {
      method: "POST",
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
            DEV CODE
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            生成済みの {generatedScreens} 画面から Next.js
            の開発コードを{hasCode ? "更新" : "生成"}します。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-danger hover:text-danger"
            >
              中断
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={generatedScreens === 0}
              className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {hasCode ? "開発コードを更新" : "開発コードを生成"}
            </button>
          )}
        </div>
      </div>

      {(running || messages.length > 0 || error) && (
        <div
          ref={logRef}
          className="mt-3 max-h-40 space-y-1 overflow-y-auto border-t border-line pt-3"
        >
          {messages.map((m, i) => (
            <MessageRow key={i} message={m.message} />
          ))}
          {running && (
            <p className="animate-pulse font-mono text-xs text-accent">…</p>
          )}
          {status === "done" && (
            <p className="font-mono text-xs text-ok">生成が完了しました。</p>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}

function MessageRow({ message }: { message: AgentMessage }) {
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
  return <p className="text-sm text-ink-soft">{message.text}</p>;
}
