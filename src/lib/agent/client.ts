import type { AgentClient } from "@/lib/generation/types";
import { MockAgent } from "./mock";
import { ClaudeCodeAgent } from "./claude-code";

/**
 * 使用するエージェントを選ぶ。
 * 既定は実機の Claude Code。APPCANVAS_AGENT=mock のときだけモックを使う
 * （サブスクリプション無しでのフロー確認・開発用）。
 */
export function getAgent(): AgentClient {
  if (process.env.APPCANVAS_AGENT === "mock") return new MockAgent();
  return new ClaudeCodeAgent();
}
