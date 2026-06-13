import Link from "next/link";
import { checkAgentHealth } from "@/lib/agent/health";
import { getDataDir } from "@/lib/storage/paths";
import { readSettings } from "@/lib/storage/settings";
import { RefreshButton } from "@/components/refresh-button";
import { AppSettingsForm } from "@/components/app-settings-form";

export const dynamic = "force-dynamic";

export default async function AppSettingsPage() {
  const health = await checkAgentHealth();
  const dataDir = getDataDir();
  const settings = readSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <nav className="font-mono text-xs tracking-wider text-ink-faint">
          <Link href="/" className="hover:text-ink">
            プロジェクト一覧
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-ink-soft">設定</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold">アプリ設定</h1>
      </div>

      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs tracking-[0.2em] text-ink-faint">
            CLAUDE CODE
          </h2>
          <RefreshButton />
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <dt className="w-28 shrink-0 text-ink-soft">検出状態</dt>
            <dd>
              {health.cliFound ? (
                <span className="rounded-sm bg-ok-soft px-1.5 py-0.5 font-mono text-xs text-ok">
                  検出済み
                </span>
              ) : (
                <span className="rounded-sm bg-danger-soft px-1.5 py-0.5 font-mono text-xs text-danger">
                  未検出
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-28 shrink-0 text-ink-soft">パス</dt>
            <dd className="break-all font-mono text-xs">
              {health.cliPath ?? "—"}
            </dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="w-28 shrink-0 text-ink-soft">バージョン</dt>
            <dd className="font-mono text-xs">{health.version ?? "—"}</dd>
          </div>
        </dl>
        {!health.cliFound && (
          <p className="mt-3 rounded bg-paper p-3 text-sm text-ink-soft">
            Claude Code がインストールされていないか、PATH
            に含まれていません。画面の生成・修正にはインストール済みで
            ログイン済みの Claude Code が必要です。インストール後に
            <code className="mx-1 rounded bg-surface px-1 font-mono text-xs">
              claude
            </code>
            コマンドでログインしてください。
          </p>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          認証状態の確認（テスト実行）は Claude Code 連携の実装（M3）で追加されます
        </p>
      </section>

      <AppSettingsForm initialModel={settings.model} cliFound={health.cliFound}>
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="font-mono text-xs tracking-[0.2em] text-ink-faint">
            STORAGE
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <dt className="w-28 shrink-0 text-ink-soft">データ保存先</dt>
              <dd className="break-all font-mono text-xs">{dataDir}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-faint">
            環境変数 APPCANVAS_DATA_DIR で変更できます（既定値は
            ~/.appcanvas、Electron版ではアプリのユーザーデータディレクトリ）
          </p>
        </section>
      </AppSettingsForm>
    </div>
  );
}
