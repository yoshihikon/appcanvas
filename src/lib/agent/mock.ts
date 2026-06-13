import type {
  AgentClient,
  GenerateScreenArgs,
  Proposal,
  ProposeArgs,
  ReviseArgs,
} from "@/lib/generation/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Claude Code を使わずにフロー全体を確認するためのモックエージェント。
 * 環境変数 APPCANVAS_AGENT=mock で選択する。
 * 入力に応じてそれっぽい構成案と、data-cid 付きの自己完結HTMLを返す。
 */
export class MockAgent implements AgentClient {
  async propose(args: ProposeArgs): Promise<{ proposal: Proposal }> {
    args.onMessage({ kind: "text", text: `入力を確認しています：「${args.input}」` });
    await sleep(200);
    args.onMessage({ kind: "tool", tool: "Read", detail: "CLAUDE.md" });
    await sleep(200);
    const proposal = buildProposal(args.input, args.context.defaultDevice);
    args.onMessage({
      kind: "text",
      text: `${proposal.screens.length}画面の構成案を作成しました。内容を確認してください。`,
    });
    return { proposal };
  }

  async revise(args: ReviseArgs): Promise<{ proposal: Proposal }> {
    args.onMessage({ kind: "text", text: `ご指示を反映します：「${args.instruction}」` });
    await sleep(300);
    // 指示に「追加」が含まれれば1画面足す簡易な振る舞い
    const screens = [...args.current.screens];
    if (args.instruction.includes("追加") || /add/i.test(args.instruction)) {
      screens.push({
        key: `extra-${screens.length + 1}`,
        name: "追加画面",
        group: screens[0]?.group ?? "その他",
        device: args.context.defaultDevice,
        description: `指示に基づく追加画面：${args.instruction}`,
        include: true,
      });
    }
    args.onMessage({ kind: "text", text: "構成案を更新しました。" });
    return { proposal: { screens } };
  }

  async generateScreen(
    args: GenerateScreenArgs,
  ): Promise<{ html: string }> {
    args.onMessage({
      kind: "tool",
      tool: "Write",
      detail: `app/screens/${args.screen.id}/page.tsx`,
    });
    await sleep(400);
    args.onMessage({ kind: "text", text: `「${args.screen.name}」を生成しました。` });
    return { html: mockScreenHtml(args) };
  }
}

function buildProposal(input: string, device: "desktop" | "mobile"): Proposal {
  const base = [
    { key: "login", name: "ログイン", group: "認証", desc: "メール＋パスワードでログイン" },
    { key: "list", name: "一覧", group: "メイン機能", desc: "主要データの一覧表示" },
    { key: "detail", name: "詳細", group: "メイン機能", desc: "1件の詳細表示・編集" },
    { key: "settings", name: "設定", group: "その他", desc: "各種設定" },
  ];
  return {
    screens: base.map((b) => ({
      key: b.key,
      name: b.name,
      group: b.group,
      device,
      description: input ? `${b.desc}（入力: ${input.slice(0, 20)}）` : b.desc,
      include: true,
    })),
  };
}

function mockScreenHtml(args: GenerateScreenArgs): string {
  const { name } = args.screen;
  const accent = "#1c64f2";
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box} body{margin:0;font-family:system-ui,sans-serif;background:#f4f6f8;color:#1b2733}
  header{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 24px;font-weight:700}
  main{padding:24px;max-width:860px;margin:0 auto}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:16px}
  .btn{display:inline-block;background:${accent};color:#fff;border:0;border-radius:6px;padding:10px 18px;font-weight:600}
  h1{font-size:22px;margin:0 0 4px} p{color:#5f6e7d}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  .cell{flex:1;min-width:160px;background:#f8fafc;border:1px solid #eef2f6;border-radius:8px;padding:14px}
</style></head>
<body>
  <header data-cid="app-header" data-cname="AppHeader">${name}</header>
  <main data-cid="main" data-cname="Main">
    <div class="card" data-cid="page-title" data-cname="PageTitle">
      <h1>${name}</h1>
      <p>${args.screen.description}</p>
    </div>
    <div class="card">
      <div class="row">
        <div class="cell" data-cid="cell-1" data-cname="InfoCell">項目 A</div>
        <div class="cell" data-cid="cell-2" data-cname="InfoCell">項目 B</div>
        <div class="cell" data-cid="cell-3" data-cname="InfoCell">項目 C</div>
      </div>
    </div>
    <button class="btn" data-cid="primary-action" data-cname="PrimaryAction">実行</button>
  </main>
</body></html>`;
}
