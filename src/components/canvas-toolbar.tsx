"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";

type Mode = "generate" | "import" | null;

/**
 * キャンバス左上の作成起点ツールバー。
 * 「AIで画面を生成」「既存の画面を取り込み」の2つの起点を提供する。
 * 実際の生成パイプライン(M3)・取り込み処理は未実装のため、現時点では
 * 入力UIまでを用意し、送信時に準備中である旨を表示する。
 */
export function CanvasToolbar({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<Mode>(null);
  void projectId; // 生成・取り込みAPI(M3)接続時に使用

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
        onClose={() => setMode(null)}
      />
      <ImportModal open={mode === "import"} onClose={() => setMode(null)} />
    </div>
  );
}

const PENDING_NOTICE =
  "入力を受け付けました。実際の処理はClaude Code連携（M3）の実装後に有効になります。";

function GenerateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function reset() {
    setInstruction("");
    setFiles([]);
    setNotice(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim() && files.length === 0) return;
    // TODO(M3): /api/projects/[id]/screens/generate へ指示とファイルを送信
    setNotice(PENDING_NOTICE);
  }

  const canSubmit = instruction.trim().length > 0 || files.length > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
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

        <FileField
          label="ファイル添付（企画書など・任意）"
          files={files}
          onChange={setFiles}
        />

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
            disabled={!canSubmit}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            生成
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
    // TODO(M2/M3): 取り込んだファイルから画面を作成する
    setNotice(PENDING_NOTICE);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="IMPORT EXISTING"
      title="既存の画面を取り込み"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FileField
          label="画面ファイルを添付"
          files={files}
          onChange={setFiles}
        />

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
