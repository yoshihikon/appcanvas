import type { ScreenStatus } from "@/lib/db/schema";

const STATUS_STYLE: Record<ScreenStatus, { label: string; className: string }> =
  {
    proposed: { label: "検討中", className: "bg-paper text-ink-soft" },
    generating: {
      label: "生成中",
      className: "bg-accent-soft text-accent animate-pulse",
    },
    generated: { label: "生成済み", className: "bg-ok-soft text-ok" },
    error: { label: "エラー", className: "bg-danger-soft text-danger" },
  };

export function StatusBadge({ status }: { status: ScreenStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.proposed;
  return (
    <span
      className={`inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-wider ${s.className}`}
    >
      {s.label}
    </span>
  );
}
