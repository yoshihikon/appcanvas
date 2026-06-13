import type { DeviceType } from "@/lib/device";

/** 構成案の1画面（docs/AI-GENERATION.md §5 proposal スキーマ） */
export type ProposedScreen = {
  /** 安定キー（生成対象の識別に使う英数字ケバブケース） */
  key: string;
  name: string;
  group: string;
  device: DeviceType;
  description: string;
  /** 生成対象に含めるか（レビューでチェックを外せる） */
  include: boolean;
};

export type Proposal = { screens: ProposedScreen[] };

/** やりとり表示用の1イベント */
export type AgentMessage =
  | { kind: "text"; text: string }
  | { kind: "tool"; tool: string; detail: string }
  | { kind: "notice"; text: string };

export type ProjectContext = {
  name: string;
  persona: string;
  overview: string;
  designSystem: string;
  skills: string[];
  defaultDevice: DeviceType;
};

export type ProposeArgs = {
  workspace: string;
  /** proposal.json を書き込む絶対パス */
  proposalPath: string;
  input: string;
  context: ProjectContext;
  model: string;
  onMessage: (m: AgentMessage) => void;
  abort?: AbortController;
};

export type ReviseArgs = ProposeArgs & {
  agentSessionId?: string;
  /** レビューで編集済みの現在案 */
  current: Proposal;
  instruction: string;
};

export type GenerateScreenArgs = {
  workspace: string;
  /** プレビュー/キャプチャ用の自己完結HTMLの出力先 */
  previewPath: string;
  screen: ProposedScreen & { id: string };
  context: ProjectContext;
  model: string;
  agentSessionId?: string;
  onMessage: (m: AgentMessage) => void;
  abort?: AbortController;
};

/** 開発コード生成の対象となる画面（プレビューHTMLと抽出済みコンポーネント付き） */
export type DevCodeScreen = {
  id: string;
  name: string;
  group: string;
  device: string;
  description: string;
  /** .appcanvas/<id>/snapshot.html の絶対パス（存在すれば） */
  snapshotPath: string;
  components: { componentId: string; name: string; type: string }[];
};

export type GenerateDevCodeArgs = {
  workspace: string;
  screens: DevCodeScreen[];
  context: ProjectContext;
  model: string;
  /** 既存の開発コードがあるか（差分追加か新規作成かの判断に使う） */
  hasExistingCode: boolean;
  agentSessionId?: string;
  onMessage: (m: AgentMessage) => void;
  abort?: AbortController;
};

/**
 * 画面生成AIの抽象。Claude Code 実装とモック実装を差し替え可能にする
 * （docs/SPECIFICATION.md 6.1 の将来のAPI切替方針）。
 */
export interface AgentClient {
  propose(args: ProposeArgs): Promise<{ proposal: Proposal; agentSessionId?: string }>;
  revise(args: ReviseArgs): Promise<{ proposal: Proposal; agentSessionId?: string }>;
  /** プレビュー用HTMLを返す（キャプチャ入力に使う） */
  generateScreen(args: GenerateScreenArgs): Promise<{ html: string; agentSessionId?: string }>;
  /** ワークスペースにNext.js開発コード一式を作成/更新する */
  generateDevCode(args: GenerateDevCodeArgs): Promise<{ agentSessionId?: string }>;
}
