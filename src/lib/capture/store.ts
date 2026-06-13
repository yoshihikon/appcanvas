import fs from "node:fs";
import path from "node:path";
import { updateScreen } from "@/lib/db/repositories/screens";
import { replaceComponents } from "@/lib/db/repositories/screen-components";
import {
  getScreenArtifactDir,
  getSnapshotFile,
  getThumbnailFile,
} from "@/lib/storage/paths";
import { captureFromHtml, type CapturedComponent } from "./capture";

/**
 * HTMLをキャプチャし、サムネ・静的HTML・コンポーネント一覧を保存して
 * 画面のメタデータを更新する。キャプチャAPIと生成オーケストレーターで共用。
 */
export async function captureAndStore(args: {
  projectId: string;
  screenId: string;
  html: string;
  device: string;
}): Promise<{ components: CapturedComponent[] }> {
  const { projectId, screenId, html, device } = args;
  const result = await captureFromHtml(html, device);

  const dir = getScreenArtifactDir(projectId, screenId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getThumbnailFile(projectId, screenId), result.thumbnail);
  fs.writeFileSync(getSnapshotFile(projectId, screenId), result.snapshotHtml);

  replaceComponents(projectId, screenId, result.components);
  updateScreen(projectId, screenId, {
    status: "generated",
    thumbnailPath: path.join(".appcanvas", screenId, "thumb.png"),
    htmlPath: path.join(".appcanvas", screenId, "snapshot.html"),
  });
  return { components: result.components };
}
