import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getScreen, updateScreen } from "@/lib/db/repositories/screens";
import { replaceComponents } from "@/lib/db/repositories/screen-components";
import { captureFromHtml } from "@/lib/capture/capture";
import {
  getScreenArtifactDir,
  getSnapshotFile,
  getThumbnailFile,
} from "@/lib/storage/paths";

type RouteContext = { params: Promise<{ id: string; screenId: string }> };

/**
 * 画面をキャプチャし、サムネイル・静的HTML・コンポーネント一覧を更新する。
 * 入力HTMLは body.html で受け取る（生成パイプライン=M3 から渡す）。
 * 省略時は既存の snapshot.html を再キャプチャする。
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { id, screenId } = await params;
  const screen = getScreen(id, screenId);
  if (!screen) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let html: string | null =
    typeof body?.html === "string" ? body.html : null;

  if (html === null) {
    const snapshot = getSnapshotFile(id, screenId);
    if (fs.existsSync(snapshot)) {
      html = fs.readFileSync(snapshot, "utf-8");
    }
  }
  if (html === null) {
    return NextResponse.json(
      { error: "キャプチャ対象のHTMLがありません" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await captureFromHtml(html, screen.device);
  } catch (err) {
    const message = err instanceof Error ? err.message : "キャプチャに失敗しました";
    updateScreen(id, screenId, { status: "error" });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const dir = getScreenArtifactDir(id, screenId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getThumbnailFile(id, screenId), result.thumbnail);
  fs.writeFileSync(getSnapshotFile(id, screenId), result.snapshotHtml);

  replaceComponents(id, screenId, result.components);
  updateScreen(id, screenId, {
    status: "generated",
    thumbnailPath: path.join(".appcanvas", screenId, "thumb.png"),
    htmlPath: path.join(".appcanvas", screenId, "snapshot.html"),
  });

  return NextResponse.json({ ok: true, components: result.components });
}
