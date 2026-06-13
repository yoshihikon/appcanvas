"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** プロジェクトの3タブ。usePathname でアクティブ判定する。 */
export function ProjectTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/projects/${id}`;
  const tabs = [
    { href: base, label: "キャンバス" },
    { href: `${base}/preview`, label: "プレビュー" },
    { href: `${base}/code`, label: "開発コード" },
  ];

  return (
    <nav className="flex gap-1 border-b border-line">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              active
                ? "border-accent text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
