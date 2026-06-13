import { DEVICE_OPTIONS } from "@/lib/device";
import { getBrowser } from "./browser";

export type CapturedComponent = {
  componentId: string;
  name: string;
  type: string;
};

export type CaptureResult = {
  /** 上部クロップ済みPNG（デバイスのキャプチャ寸法） */
  thumbnail: Buffer;
  /** レンダリング後のDOM（静的HTMLスナップショット） */
  snapshotHtml: string;
  /** data-cid を持つ要素から抽出したコンポーネント一覧 */
  components: CapturedComponent[];
};

/**
 * 画面のHTMLをデバイス幅でレンダリングし、上部を一定サイズでクロップした
 * サムネイル・静的HTML・コンポーネント一覧を返す（docs/AI-GENERATION.md §3,§7.2）。
 */
export async function captureFromHtml(
  html: string,
  device: string,
): Promise<CaptureResult> {
  const dev =
    DEVICE_OPTIONS.find((d) => d.value === device) ?? DEVICE_OPTIONS[0];
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: dev.capture.width, height: dev.capture.height },
    deviceScaleFactor: 1,
  });
  try {
    await page.setContent(html, { waitUntil: "load" });
    // フォント・画像のレイアウト確定を少し待つ
    await page.waitForTimeout(150);

    // 縦長でも上部を固定サイズで切り出す（フルページにしない）
    const thumbnail = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: dev.capture.width, height: dev.capture.height },
    });

    const snapshotHtml = await page.content();

    const raw = await page.$$eval("[data-cid]", (els) =>
      els.map((el) => ({
        componentId: el.getAttribute("data-cid") ?? "",
        name: el.getAttribute("data-cname") ?? "",
        type: el.tagName.toLowerCase(),
      })),
    );

    // componentId で重複排除（最初の出現を採用）。name 未指定は id で補う
    const seen = new Set<string>();
    const components: CapturedComponent[] = [];
    for (const c of raw) {
      if (!c.componentId || seen.has(c.componentId)) continue;
      seen.add(c.componentId);
      components.push({
        componentId: c.componentId,
        name: c.name || c.componentId,
        type: c.type,
      });
    }

    return { thumbnail: Buffer.from(thumbnail), snapshotHtml, components };
  } finally {
    await page.close();
  }
}
