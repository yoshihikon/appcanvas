import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppCanvas",
  description: "アプリケーション画面のデザインと管理を行うローカルツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rotate-45 bg-accent" />
              <span className="font-mono text-sm font-semibold tracking-[0.18em] text-ink">
                APPCANVAS
              </span>
            </Link>
            <nav>
              <Link
                href="/settings"
                className="rounded px-2 py-1 font-mono text-xs tracking-wider text-ink-soft hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                設定
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
