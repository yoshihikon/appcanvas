import fs from "node:fs";
import { getSnapshotFile } from "@/lib/storage/paths";
import { listScreens } from "@/lib/db/repositories/screens";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ projectId: string; screenId: string }> };

/**
 * 画面プレビュー用HTMLを配信する（画面詳細・プレビュータブの iframe 埋め込み用）。
 * 静的HTMLスナップショットがあればそれを、無ければプレースホルダを返す。
 * どの画面からも他画面へ遷移できるよう、全画面へのナビゲーションを先頭に注入する
 * （生成HTML自体に画面間リンクが無くてもプレビュー間を行き来できるようにするため）。
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { projectId, screenId } = await params;
  const file = getSnapshotFile(projectId, screenId);

  const base = fs.existsSync(file)
    ? fs.readFileSync(file, "utf-8")
    : PLACEHOLDER;

  const html = injectNav(base, projectId, screenId);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // 再生成を即時反映させるためキャッシュしない
      "Cache-Control": "no-store",
    },
  });
}

function injectNav(html: string, projectId: string, currentId: string): string {
  const screens = listScreens(projectId);
  if (screens.length <= 1) return html;

  const links = screens
    .map((s) => {
      const active = s.id === currentId;
      const style = active
        ? "background:#1c64f2;color:#fff;"
        : "background:#fff;color:#1b2733;";
      return `<a href="/preview/${projectId}/${s.id}" style="display:inline-block;flex:0 0 auto;padding:4px 10px;border:1px solid #d7dee5;border-radius:6px;font:600 12px system-ui,sans-serif;text-decoration:none;${style}">${escapeHtml(s.name)}</a>`;
    })
    .join("");

  const nav = `<nav data-appcanvas-nav style="position:sticky;top:0;z-index:2147483647;display:flex;gap:6px;align-items:center;overflow-x:auto;padding:8px 10px;background:#eef1f4;border-bottom:1px solid #d7dee5;">${links}</nav>`;

  // <body ...> の直後に挿入。無ければ先頭に付ける。
  const m = html.match(/<body[^>]*>/i);
  if (m && m.index !== undefined) {
    const at = m.index + m[0].length;
    return html.slice(0, at) + nav + html.slice(at);
  }
  return nav + html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PLACEHOLDER = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;
    background:#eef1f4;color:#93a0ad;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    letter-spacing:.2em;font-size:12px}
</style></head>
<body>NOT GENERATED YET</body></html>`;
