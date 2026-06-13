import fs from "node:fs";
import type {
  AgentClient,
  AgentMessage,
  GenerateDevCodeArgs,
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
${existingScreensBlock(args.existingScreens)}
# ユーザーの指示

${args.input || "（指示なし。前提情報から妥当な画面構成を考えてください）"}`;
    const { agentSessionId } = await runQuery({
      prompt,
      cwd: args.workspace,
      model: args.model,
      onMessage: args.onMessage,
      abort: args.abort,
    });
    return { proposal: readProposal(args.proposalPath), agentSessionId };
  }

  async revise(
    args: ReviseArgs,
  ): Promise<{ proposal: Proposal; agentSessionId?: string }> {
    const prompt = `現在の構成案は ${args.proposalPath} にあります（内容: ${JSON.stringify(
      args.current,
    )}）。以下の指示を反映して同じファイルを上書きしてください。スキーマは変えないこと。
${existingScreensBlock(args.existingScreens)}
# 指示

${args.instruction}`;
    const { agentSessionId } = await runQuery({
      prompt,
      cwd: args.workspace,
      model: args.model,
      resume: args.agentSessionId,
      onMessage: args.onMessage,
      abort: args.abort,
    });
    return { proposal: readProposal(args.proposalPath), agentSessionId };
  }

  async generateScreen(
    args: GenerateScreenArgs,
  ): Promise<{ html: string; agentSessionId?: string }> {
    const prompt = `次の画面のデザイン検討用プレビューを${args.isUpdate ? "更新" : "作成"}してください。

- 画面名: ${args.screen.name}
- 役割: ${args.screen.description}
- デバイス: ${args.screen.device === "mobile" ? "スマホ(幅390px想定)" : "PC(幅1440px想定)"}

要件:
${
  args.isUpdate
    ? `- これは既存画面の更新です。まず既存のプレビュー ${args.previewPath} を読み、デザインの一貫性を保ちつつ役割・指示に沿って修正してください（全面的に作り直さず差分で）。`
    : `- 外部依存のない自己完結HTML（インラインCSS）を ${args.previewPath} に新規作成してください。`
}
- 主要要素には data-cid 属性を付与する（CLAUDE.mdの規約に従う）。
- この工程ではNext.jsの開発コード（page.tsx等）は作らない。プレビューHTMLのみ。

完了したら終了してください。`;
    const { agentSessionId } = await runQuery({
      prompt,
      cwd: args.workspace,
      model: args.model,
      resume: args.agentSessionId,
      onMessage: args.onMessage,
      abort: args.abort,
    });
    if (!fs.existsSync(args.previewPath)) {
      throw new Error("プレビューHTMLが生成されませんでした");
    }
    return { html: fs.readFileSync(args.previewPath, "utf-8"), agentSessionId };
  }

  async generateDevCode(
    args: GenerateDevCodeArgs,
  ): Promise<{ agentSessionId?: string }> {
    const screenList = args.screens
      .map(
        (s) =>
          `- ${s.name}（${s.device}, グループ: ${s.group || "未分類"}）: ${s.description}\n  プレビューHTML: ${s.snapshotPath}\n  コンポーネント: ${s.components.map((c) => c.componentId).join(", ") || "（なし）"}`,
      )
      .join("\n");
    const prompt = `このワークスペースに、各画面の開発用 Next.js コード（App Router + Tailwind）を作成してください。

${
  args.hasExistingCode
    ? "既存の開発コードがあります。まず既存ファイルを読み、構成・共有コンポーネント・命名を踏まえて、不足している画面を追加・更新してください（全面的に作り直さない）。"
    : "新規に Next.js プロジェクト構成（app/ ディレクトリ、共有コンポーネントは components/）でコードを作成してください。"
}

各画面のプレビューHTMLを参照し、実装の見た目・構造の根拠にしてください。data-cid のコンポーネントは再利用可能な部品として切り出すことを検討してください。

対象画面:
${screenList}

方針:
- App Router 構成（app/<route>/page.tsx）。画面ごとに分かりやすいルートを切る。
- 繰り返し使う要素は components/ に共有コンポーネントとして実装し、各画面から使う。
- .appcanvas/ 配下は AppCanvas 管理の生成物なので編集しない。
- CLAUDE.md のプロジェクト前提・デザインシステム・適用スキルに従う。

完了したら終了してください。`;
    return runQuery({
      prompt,
      cwd: args.workspace,
      model: args.model,
      resume: args.agentSessionId,
      onMessage: args.onMessage,
      abort: args.abort,
    });
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
      "device": "desktop" | "mobile", "description": "...", "include": true,
      "screenId": "（任意）既存画面を更新する場合のみ、その画面ID" }
  ]
}

- key は英数字ケバブケースで画面ごとに一意
- 既存画面を作り直さず更新したい場合は、その画面の "screenId" を指定する
- 既に十分な既存画面と重複する新規画面は作らない
- まだコードは書かない。構成案(JSON)の作成のみ
- ファイルを書いたら終了する`;
}

function existingScreensBlock(existing: ProposeArgs["existingScreens"]): string {
  if (!existing || existing.length === 0) return "";
  const lines = existing
    .map(
      (s) =>
        `- screenId=${s.id} | ${s.name}（${s.device}, グループ: ${s.group || "未分類"}, 状態: ${s.status}）: ${s.description}`,
    )
    .join("\n");
  return `
# 既存の画面（更新する場合は screenId を使う）

${lines}
`;
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
      ...(typeof s.screenId === "string" && s.screenId
        ? { screenId: s.screenId }
        : {}),
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
  abort?: AbortController;
}): Promise<{ agentSessionId?: string }> {
  const sdk = await loadSdk();
  const response = sdk.query({
    prompt: opts.prompt,
    options: {
      cwd: opts.cwd,
      model: opts.model,
      resume: opts.resume,
      allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
      permissionMode: "acceptEdits",
      // 中断時に Claude Code 側の処理も止める
      abortController: opts.abort,
    },
  });

  let agentSessionId: string | undefined;
  for await (const message of response) {
    if (opts.abort?.signal.aborted) break;
    if (message.type === "assistant") {
      if (message.session_id) agentSessionId = message.session_id;
      for (const block of message.message?.content ?? []) {
        if (block.type === "text" && block.text?.trim()) {
          opts.onMessage({ kind: "text", text: block.text });
        } else if (block.type === "tool_use") {
          opts.onMessage({
            kind: "tool",
            tool: block.name ?? "tool",
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

/**
 * Claude Agent SDK は任意依存。バンドラに静的解決させないため変数指定＋
 * webpackIgnore で動的importする。未インストールでもアプリのビルド・起動は
 * 通り、実機のClaude Code経路を使うときだけ必要になる。
 */
type SdkBlock = { type: string; text?: string; name?: string; input?: unknown };
type SdkMessage = {
  type: string;
  subtype?: string;
  session_id?: string;
  message?: { content: SdkBlock[] };
};
type AgentSdk = {
  query: (params: {
    prompt: string;
    options?: Record<string, unknown>;
  }) => AsyncIterable<SdkMessage>;
};

async function loadSdk(): Promise<AgentSdk> {
  const moduleName = "@anthropic-ai/claude-agent-sdk";
  try {
    return (await import(/* webpackIgnore: true */ moduleName)) as unknown as AgentSdk;
  } catch {
    throw new Error(
      "Claude Agent SDK (@anthropic-ai/claude-agent-sdk) が見つかりません。" +
        "AI画面生成には `npm install` でのインストールが必要です。" +
        "Claude Code なしで動作を確認する場合は APPCANVAS_AGENT=mock を使ってください。",
    );
  }
}

function toolDetail(input: unknown): string {
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const p = obj.file_path ?? obj.path ?? obj.pattern ?? obj.command;
    if (typeof p === "string") return p;
  }
  return "";
}
