import fs from "node:fs";
import type {
  AgentClient,
  AgentMessage,
  GenerateScreenArgs,
  Proposal,
  ProposeArgs,
  ReviseArgs,
} from "@/lib/generation/types";

/**
 * ローカルの Claude Code を Claude Agent SDK 経由で駆動する実装。
 * ユーザーがログイン済みであればサブスクリプション認証が使われ、APIキーは不要
 * （docs/SPECIFICATION.md 6.1）。SDKは実行時に動的importする。
 */
export class ClaudeCodeAgent implements AgentClient {
  async propose(
    args: ProposeArgs,
  ): Promise<{ proposal: Proposal; agentSessionId?: string }> {
    const prompt = `${proposalInstruction(args.proposalPath)}

# ユーザーの指示

${args.input || "（指示なし。前提情報から妥当な画面構成を考えてください）"}`;
    const { agentSessionId } = await runQuery({
      prompt,
      cwd: args.workspace,
      model: args.model,
      onMessage: args.onMessage,
      signal: args.signal,
    });
    return { proposal: readProposal(args.proposalPath), agentSessionId };
  }

  async revise(
    args: ReviseArgs,
  ): Promise<{ proposal: Proposal; agentSessionId?: string }> {
    const prompt = `現在の構成案は ${args.proposalPath} にあります（内容: ${JSON.stringify(
      args.current,
    )}）。以下の指示を反映して同じファイルを上書きしてください。スキーマは変えないこと。

# 指示

${args.instruction}`;
    const { agentSessionId } = await runQuery({
      prompt,
      cwd: args.workspace,
      model: args.model,
      resume: args.agentSessionId,
      onMessage: args.onMessage,
      signal: args.signal,
    });
    return { proposal: readProposal(args.proposalPath), agentSessionId };
  }

  async generateScreen(
    args: GenerateScreenArgs,
  ): Promise<{ html: string; agentSessionId?: string }> {
    const prompt = `次の画面を作成してください。

- 画面名: ${args.screen.name}
- 役割: ${args.screen.description}
- デバイス: ${args.screen.device === "mobile" ? "スマホ(幅390px想定)" : "PC(幅1440px想定)"}

手順:
1. Next.js + Tailwind のコードを ${args.codePath} に作成する。主要要素には data-cid 属性を付与する（CLAUDE.mdの規約に従う）。
2. プレビュー/サムネ用に、外部依存のない自己完結HTML（インラインCSS）を ${args.previewPath} に作成する。見た目は1の画面に合わせ、data-cid も同じものを付与する。

完了したら終了してください。`;
    const { agentSessionId } = await runQuery({
      prompt,
      cwd: args.workspace,
      model: args.model,
      resume: args.agentSessionId,
      onMessage: args.onMessage,
      signal: args.signal,
    });
    if (!fs.existsSync(args.previewPath)) {
      throw new Error("プレビューHTMLが生成されませんでした");
    }
    return { html: fs.readFileSync(args.previewPath, "utf-8"), agentSessionId };
  }
}

function proposalInstruction(proposalPath: string): string {
  return `あなたはアプリの画面構成を検討するアシスタントです。
CLAUDE.md のプロジェクト前提情報と、適用スキル・デザインシステムを踏まえ、
作るべき画面の構成案を JSON で ${proposalPath} に書き出してください。

スキーマ:
{
  "screens": [
    { "key": "login", "name": "ログイン", "group": "認証",
      "device": "desktop" | "mobile", "description": "...", "include": true }
  ]
}

- key は英数字ケバブケースで画面ごとに一意
- まだコードは書かない。構成案(JSON)の作成のみ
- ファイルを書いたら終了する`;
}

function readProposal(proposalPath: string): Proposal {
  if (!fs.existsSync(proposalPath)) {
    throw new Error("構成案(proposal.json)が生成されませんでした");
  }
  const parsed = JSON.parse(fs.readFileSync(proposalPath, "utf-8"));
  const screens = Array.isArray(parsed?.screens) ? parsed.screens : [];
  return {
    screens: screens.map((s: Record<string, unknown>) => ({
      key: String(s.key ?? crypto.randomUUID().slice(0, 8)),
      name: String(s.name ?? "画面"),
      group: String(s.group ?? ""),
      device: s.device === "mobile" ? "mobile" : "desktop",
      description: String(s.description ?? ""),
      include: s.include !== false,
    })),
  };
}

/** Claude Agent SDK の query を実行し、メッセージを onMessage に中継する */
async function runQuery(opts: {
  prompt: string;
  cwd: string;
  model: string;
  resume?: string;
  onMessage: (m: AgentMessage) => void;
  signal?: AbortSignal;
}): Promise<{ agentSessionId?: string }> {
  // 未インストールでもアプリのビルドが通るよう動的import
  const sdk = (await import("@anthropic-ai/claude-agent-sdk")) as typeof import("@anthropic-ai/claude-agent-sdk");
  const response = sdk.query({
    prompt: opts.prompt,
    options: {
      cwd: opts.cwd,
      model: opts.model,
      resume: opts.resume,
      allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
      permissionMode: "acceptEdits",
    },
  });

  let agentSessionId: string | undefined;
  for await (const message of response) {
    if (opts.signal?.aborted) break;
    if (message.type === "assistant") {
      agentSessionId = message.session_id;
      for (const block of message.message.content) {
        if (block.type === "text" && block.text.trim()) {
          opts.onMessage({ kind: "text", text: block.text });
        } else if (block.type === "tool_use") {
          opts.onMessage({
            kind: "tool",
            tool: block.name,
            detail: toolDetail(block.input),
          });
        }
      }
    } else if (message.type === "result" && message.subtype !== "success") {
      throw new Error(`Claude Code の実行に失敗しました (${message.subtype})`);
    }
  }
  return { agentSessionId };
}

function toolDetail(input: unknown): string {
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const p = obj.file_path ?? obj.path ?? obj.pattern ?? obj.command;
    if (typeof p === "string") return p;
  }
  return "";
}
