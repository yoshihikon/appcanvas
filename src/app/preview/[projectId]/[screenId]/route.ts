import fs from "node:fs";
import { getSnapshotFile } from "@/lib/storage/paths";

type RouteContext = { params: Promise<{ projectId: string; screenId: string }> };

/**
 * 画面プレビュー用HTMLを配信する（画面詳細の iframe 埋め込み用）。
 * 静的HTMLスナップショットがあればそれを返し、無ければプレースホルダ。
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { projectId, screenId } = await params;
  const file = getSnapshotFile(projectId, screenId);

  const html = fs.existsSync(file)
    ? fs.readFileSync(file, "utf-8")
    : PLACEHOLDER;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
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
