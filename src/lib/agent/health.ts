import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type AgentHealth = {
  cliFound: boolean;
  cliPath: string | null;
  version: string | null;
  checkedAt: string;
};

/**
 * Claude Code CLI の検出。
 * M3でAgent SDK統合時に「軽量プロンプト実行による認証確認」を追加する。
 */
export async function checkAgentHealth(): Promise<AgentHealth> {
  const checkedAt = new Date().toISOString();
  let cliPath: string | null = null;
  try {
    const { stdout } = await execFileAsync(
      process.platform === "win32" ? "where" : "which",
      ["claude"],
      { timeout: 5_000 },
    );
    cliPath = stdout.trim().split("\n")[0] || null;
  } catch {
    return { cliFound: false, cliPath: null, version: null, checkedAt };
  }

  let version: string | null = null;
  try {
    const { stdout } = await execFileAsync("claude", ["--version"], {
      timeout: 10_000,
    });
    version = stdout.trim() || null;
  } catch {
    // CLIはあるがバージョン取得に失敗。検出済みとして扱う
  }
  return { cliFound: true, cliPath, version, checkedAt };
}
