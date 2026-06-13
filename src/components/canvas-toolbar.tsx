"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { GenerationDrawer } from "@/components/generation-drawer";
import { DEVICE_OPTIONS } from "@/lib/device";

type Mode = "generate" | "import" | null;

/**
 * キャンバス左上の作成起点ツールバー。
 * 「AIで画面を生成」は生成ランを開始して右ドロワーを開く。
 * 「既存の画面を取り込み」は取り込み処理（M3以降）までのUI。
 */
export function CanvasToolbar({
  projectId,
  defaultDevice,
}: {
  projectId: string;
  defaultDevice: string;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [runId, setRunId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setMode("generate")}
        className="rounded bg-accent px-3 py-2 text-sm font-medium text-surface hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        AIで画面を生成
      </button>
      <button
        type="button"
        onClick={() => setMode("import")}
        className="rounded border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        既存の画面を取り込み
      </button>

      <GenerateModal
        open={mode === "generate"}
        projectId={projectId}
        defaultDevice={defaultDevice}
        onClose={() => setMode(null)}
        onStarted={(id) => {
          setMode(null);
          setRunId(id);
        }}
      />
      <ImportModal open={mode === "import"} onClose={() => setMode(null)} />

      {runId && (
        <GenerationDrawer
          projectId={projectId}
          runId={runId}
          onClose={() => setRunId(null)}
        />
      )}
    </div>
  );
}

function GenerateModal({
  open,
  projectId,
  defaultDevice,
  onClose,
  onStarted,
}: {
  open: boolean;
  projectId: string;
  defaultDevice: string;
  onClose: () => void;
  onStarted: (runId: string) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [device, setDevice] = useState(defaultDevice);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setInstruction("");
    setFiles([]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() && files.length === 0) return;
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/generations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: instruction.trim(), defaultDevice: device }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "開始に失敗しました");
        return;
      }
      reset();
      onStarted(data.runId);
    } catch {
      setError("開始に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = instruction.trim().length > 0 || files.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!submitting}
      eyebrow="GENERATE WITH AI"
      title="AIで画面を生成"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] tracking-wider text-ink-soft">
            指示内容
          </span>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={5}
            placeholder="どんな画面を作りたいか、対象機能や画面の構成などを記述してください"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
          />
        </label>

        <div>
          <span className="mb-1 block font-mono text-[10px] tracking-wider text-ink-soft">
            対象フォームファクタ
          </span>
          <div className="flex gap-2">
            {DEVICE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                  device === opt.value
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name="gen-device"
                  checked={device === opt.value}
                  onChange={() => setDevice(opt.value)}
                  className="accent-accent"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <FileField
          label="ファイル添付（企画書など・任意）"
          files={files}
          onChange={setFiles}
        />

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded px-3 py-2 text-sm text-ink-soft hover:bg-paper disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitting ? "開始中…" : "生成"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function handleClose() {
    setFiles([]);
    setNotice(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    // TODO: 取り込んだファイルから画面を作成する
    setNotice("入力を受け付けました。取り込み処理は今後実装されます。");
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="IMPORT EXISTING"
      title="既存の画面を取り込み"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FileField label="画面ファイルを添付" files={files} onChange={setFiles} />
        {notice && (
          <p className="rounded bg-accent-soft px-3 py-2 text-xs text-accent">
            {notice}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="rounded px-3 py-2 text-sm text-ink-soft hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={files.length === 0}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink/85 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            取り込み
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FileField({
  label,
  files,
  onChange,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  return (
    <div>
      <span className="mb-1 block font-mono text-[10px] tracking-wider text-ink-soft">
        {label}
      </span>
      <label className="flex cursor-pointer items-center justify-center rounded border border-dashed border-line px-3 py-4 text-sm text-ink-soft hover:border-accent hover:text-accent focus-within:outline-2 focus-within:outline-accent">
        <input
          type="file"
          multiple
          onChange={(e) => onChange(Array.from(e.target.files ?? []))}
          className="sr-only"
        />
        ファイルを選択
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="truncate font-mono text-xs text-ink-soft"
            >
              {f.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
