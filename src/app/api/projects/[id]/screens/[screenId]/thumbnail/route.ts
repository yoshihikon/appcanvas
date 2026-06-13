import fs from "node:fs";
import { getThumbnailFile } from "@/lib/storage/paths";

type RouteContext = { params: Promise<{ id: string; screenId: string }> };

/** 画面のサムネイル(PNG)を配信する。未生成なら404。 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id, screenId } = await params;
  const file = getThumbnailFile(id, screenId);
  if (!fs.existsSync(file)) {
    return new Response("not found", { status: 404 });
  }
  const buffer = fs.readFileSync(file);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      // 再キャプチャを即時反映させるためキャッシュしない
      "Cache-Control": "no-store",
    },
  });
}
