import type { Browser } from "playwright-core";

/**
 * Chromium をプロセス内で1つだけ起動して使い回す。
 * playwright-core はブラウザを同梱しないため、実行ファイルは
 * - 環境変数 APPCANVAS_CHROMIUM_PATH（明示パス）、または
 * - インストール済み Chrome（channel: "chrome"）
 * から解決する。見つからない場合は分かりやすいエラーにする。
 */
let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise;

  browserPromise = (async () => {
    const { chromium } = await import("playwright-core");
    const executablePath = process.env.APPCANVAS_CHROMIUM_PATH;
    try {
      return executablePath
        ? await chromium.launch({ executablePath })
        : await chromium.launch({ channel: "chrome" });
    } catch (cause) {
      throw new Error(
        "サムネイル生成用のブラウザを起動できませんでした。Google Chrome をインストールするか、" +
          "環境変数 APPCANVAS_CHROMIUM_PATH に Chromium 実行ファイルのパスを指定してください。",
        { cause },
      );
    }
  })().catch((err) => {
    browserPromise = null; // 次回再試行できるようにする
    throw err;
  });

  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  await browser?.close();
}
