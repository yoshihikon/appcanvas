import fs from "node:fs";
import { NextResponse } from "next/server";
import { getScreen, updateScreen } from "@/lib/db/repositories/screens";
import { captureAndStore } from "@/lib/capture/store";
import { getSnapshotFile } from "@/lib/storage/paths";

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

  try {
    const { components } = await captureAndStore({
      projectId: id,
      screenId,
      html,
      device: screen.device,
    });
    return NextResponse.json({ ok: true, components });
  } catch (err) {
    const message = err instanceof Error ? err.message : "キャプチャに失敗しました";
    updateScreen(id, screenId, { status: "error" });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
