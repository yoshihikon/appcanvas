"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DevCodeGenerator } from "@/components/dev-code-generator";

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
};

/**
 * 開発コードタブ。左にファイルツリー、右に選択ファイルのコード（閲覧専用）。
 * 開発コードは複数コンポーネントの組み合わせのためプレビューは表示しない。
 */
export function CodeBrowser({
  projectId,
  hasCode,
  generatedScreens,
}: {
  projectId: string;
  hasCode: boolean;
  generatedScreens: number;
}) {
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);

  const loadTree = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/code/tree`);
    if (!res.ok) return;
    const data = await res.json();
    setTree(data.tree ?? []);
  }, [projectId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  async function openFile(path: string) {
    setSelected(path);
    setLoadingFile(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/code/file?path=${encodeURIComponent(path)}`,
      );
      const data = await res.json();
      setContent(res.ok ? data.content : `// ${data.error ?? "読み込みに失敗しました"}`);
    } finally {
      setLoadingFile(false);
    }
  }

  const empty = tree.length === 0;

  return (
    <div className="space-y-4">
      <DevCodeGenerator
        projectId={projectId}
        hasCode={hasCode}
        generatedScreens={generatedScreens}
        onDone={() => {
          loadTree();
          router.refresh();
        }}
      />

      {empty ? (
        <div className="rounded-lg border border-dashed border-line bg-surface/60 px-8 py-16 text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-faint">
            NO DEV CODE
          </p>
          <p className="mt-3 text-ink-soft">
            開発コードはまだありません。上のボタンから生成してください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-3 py-2">
              <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faint">
                FILES
              </span>
            </div>
            <div className="max-h-[70vh] overflow-auto p-2">
              <FileTree
                nodes={tree}
                depth={0}
                selected={selected}
                onSelect={openFile}
              />
            </div>
          </aside>

          <section className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-4 py-2">
              <span className="font-mono text-xs text-ink-soft">
                {selected ?? "ファイルを選択してください"}
              </span>
            </div>
            <div className="max-h-[70vh] overflow-auto bg-paper/40">
              {selected && !loadingFile ? (
                <CodeView content={content} />
              ) : (
                <p className="p-6 text-sm text-ink-soft">
                  {loadingFile ? "読み込み中…" : "左のファイルを選ぶとコードを表示します。"}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function FileTree({
  nodes,
  depth,
  selected,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <ul>
      {nodes.map((node) =>
        node.type === "dir" ? (
          <DirNode
            key={node.path}
            node={node}
            depth={depth}
            selected={selected}
            onSelect={onSelect}
          />
        ) : (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelect(node.path)}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={`flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                selected === node.path
                  ? "bg-accent-soft text-accent"
                  : "text-ink-soft hover:bg-paper hover:text-ink"
              }`}
            >
              <span aria-hidden className="text-ink-faint">
                ◦
              </span>
              <span className="truncate font-mono text-xs">{node.name}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

function DirNode({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="flex w-full items-center gap-1.5 rounded py-1 pr-2 text-left text-sm text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span aria-hidden className="text-ink-faint">
          {open ? "▾" : "▸"}
        </span>
        <span className="truncate font-mono text-xs font-medium">{node.name}</span>
      </button>
      {open && node.children && node.children.length > 0 && (
        <FileTree
          nodes={node.children}
          depth={depth + 1}
          selected={selected}
          onSelect={onSelect}
        />
      )}
    </li>
  );
}

function CodeView({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <pre className="overflow-auto p-0 text-xs leading-5">
      <code className="block">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-10 shrink-0 select-none bg-surface/50 px-2 text-right font-mono text-ink-faint">
              {i + 1}
            </span>
            <span className="whitespace-pre px-3 font-mono text-ink">
              {line || " "}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}
