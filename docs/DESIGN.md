# AppCanvas 設計書

アプリケーション画面のデザインと管理を行うローカルアプリ「AppCanvas」のアーキテクチャ設計書。

- 対象読者: 本アプリを開発するシステムエンジニア / UIデザイナー
- ステータス: 初版（実装前のベースライン設計）

---

## 1. コンセプト

| 項目 | 内容 |
|---|---|
| 目的 | 開発するアプリの画面を「本開発に繋がる形」でデザイン・管理する |
| Figmaとの違い | 自由配置のドローイングではなく、**実コード（Next.js）と画面メタデータの管理**に重きを置く |
| 利用者 | SE（画面とコードの管理）、UIデザイナー（画面の検討・修正指示） |
| 生成AI | ユーザーが契約している **Claude Code** をローカル連携（APIキー不要） |
| 実行形態 | 開発・テスト時はローカルサーバー（`next dev`）、配布時は **Electron** でパッケージ |

### 中核となる体験

1. プロジェクトを作成し、企画書などのインプットを投入する
2. AIが画面一覧を提案し、キャンバスに**格子状に整列した枠**が作られる
3. 各画面のNext.jsコードが生成され、サムネイルが枠に貼られる
4. サムネイルをクリックすると「画面プレビュー＋チャット」が開き、指示しながらAIで修正する
5. 画面ごとのコード・静的HTML・コンポーネントID一覧が蓄積され、本開発のインプットになる

---

## 2. 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| フロントエンド | Next.js 15（App Router）+ React 19 + TypeScript | 生成する画面もNext.jsなので、アプリ本体と画面ワークスペースで技術を統一できる |
| スタイリング | Tailwind CSS | 生成コードとの相性が良く、AIが扱いやすい |
| デスクトップ化 | Electron + electron-builder | 要件。mainプロセスは薄く保つ（後述） |
| DB | SQLite（better-sqlite3）+ **Drizzle ORM** | ローカル完結・ゼロ設定。DrizzleはSQLite/PostgreSQL両対応なので将来のクラウドPostgreSQL移行が容易 |
| 生成AI連携 | **Claude Agent SDK**（`@anthropic-ai/claude-agent-sdk`） | ローカルにインストール済みのClaude Code（サブスクリプション認証）をプログラムから駆動できる。APIキー不要 |
| サムネイル生成 | Playwright（headless Chromium） | レンダリング済み画面のスクリーンショット取得と静的HTML抽出 |

---

## 3. 全体アーキテクチャ

### 3.1 方針: 「ビジネスロジックはすべてNext.jsサーバー側」

開発時（ローカルサーバー）と配布時（Electron）で挙動を同一にするため、**Electronのmainプロセスには業務ロジックを置かない**。DBアクセス・Claude Code連携・ファイルIOはすべてNext.jsのRoute Handler（`app/api/**`）に実装する。

```
┌─────────────────────────────────────────────────────────┐
│ Electron main（配布時のみ・薄い層）                          │
│  - Next.js standalone サーバーを子プロセスとして起動          │
│  - BrowserWindow で http://localhost:<port> をロード        │
│  - ファイル選択ダイアログ等のOSネイティブ機能（最小限のIPC）    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (localhost)
┌──────────────────────▼──────────────────────────────────┐
│ Next.js アプリ（開発時は next dev、配布時は standalone）     │
│                                                          │
│  UI（React）                                             │
│   ├ プロジェクト一覧 / キャンバス / 画面詳細 / 設定           │
│   └ プレビュー用 iframe（/preview/[screenId]）             │
│                                                          │
│  Route Handlers（app/api/**）                            │
│   ├ projects / screens / inputs CRUD ──→ SQLite(Drizzle) │
│   ├ chat（SSEストリーミング）──→ Claude Agent SDK          │
│   └ capture（サムネ/静的HTML）──→ Playwright              │
└──────────────────────┬──────────────────────────────────┘
                       │ spawn（ローカルプロセス）
┌──────────────────────▼──────────────────────────────────┐
│ Claude Code（ユーザーのサブスクリプション認証を利用）          │
│  - プロジェクトのワークスペースを cwd にして起動              │
│  - 画面コード（page.tsx 等）を直接 Read/Write/Edit          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 開発時と配布時の差分

| | 開発・テスト時 | 配布時 |
|---|---|---|
| 起動 | `npm run dev`（ブラウザで利用） | Electronアプリのダブルクリック |
| Next.js | `next dev` | `next build`（`output: "standalone"`）をElectron mainが子プロセス起動 |
| データ保存先 | リポジトリ外の開発用ディレクトリ（環境変数 `APPCANVAS_DATA_DIR` で指定） | `app.getPath("userData")` 配下（環境変数で注入） |
| Claude Code | 開発者自身のログインを使用 | 利用者のログインを使用 |

ポートは起動時に空きポートを動的に確保し、Electron mainからNext.jsへ環境変数で渡す。

---

## 4. データ管理

### 4.1 保存場所のレイアウト

「プロジェクト＝自己完結したフォルダ」にする。zipで共有・Git管理が可能で、SEとデザイナー間の受け渡しが容易。

```
<dataDir>/                          # 例: ~/Library/Application Support/AppCanvas
├─ settings.json                    # アプリ設定（Claude Code連携設定など）
├─ registry.json                    # プロジェクトの登録簿（id・名前・パス・最終更新）
└─ projects/
   └─ <projectId>/
      ├─ project.db                 # プロジェクト単位のSQLite（下記スキーマ）
      ├─ inputs/                    # 企画書などの投入ファイル（PDF/MD/テキスト）
      └─ workspace/                 # Claude Codeが作業するNext.jsワークスペース
         ├─ CLAUDE.md               # プロジェクト前提情報から自動生成（AIへのコンテキスト）
         ├─ app/screens/<screenId>/page.tsx   # 画面のNext.jsコード（正本はファイル）
         ├─ components/             # 画面間で共有するコンポーネント
         └─ .appcanvas/<screenId>/
            ├─ snapshot.html        # 静的HTMLスナップショット
            └─ thumb.png            # サムネイル
```

**設計上のポイント**

- **画面のNext.jsコードの正本はファイル**（`workspace/`）。Claude Codeはファイルを直接編集するのが最も得意であり、本開発への移植もファイルコピーで済む。DBにはパスとメタデータを持つ。
- 静的HTML・サムネイルは再生成可能な派生物としてファイル保存し、DBはパス参照のみ。
- `workspace/` はそれ自体が最小構成のNext.jsプロジェクトであり、プレビュー時はアプリ本体のNext.jsから動的に読み込んで表示する。

### 4.2 DBスキーマ（Drizzle / SQLite）

```
projects（registry.jsonと対になるプロジェクト本体）
├─ id            TEXT PK (uuid)
├─ name          TEXT
├─ persona       TEXT      -- 対象ユーザーのペルソナ・利用シーン
├─ overview      TEXT      -- 機能概要
├─ created_at / updated_at

screens（画面）
├─ id            TEXT PK (uuid)
├─ project_id    FK → projects
├─ name          TEXT      -- 画面名（例: ログイン画面）
├─ description   TEXT      -- 画面の役割・検討メモ
├─ status        TEXT      -- 'proposed' | 'generating' | 'generated' | 'error'
├─ sort_order    INTEGER   -- キャンバス上の並び順
├─ group_name    TEXT      -- キャンバス上のグルーピング（例: 認証 / メイン機能）
├─ code_path     TEXT      -- workspace内のpage.tsx相対パス
├─ html_path     TEXT      -- snapshot.html
├─ thumbnail_path TEXT     -- thumb.png
├─ created_at / updated_at

screen_components（画面内コンポーネント＝本開発で使う情報）
├─ id            TEXT PK
├─ screen_id     FK → screens
├─ component_id  TEXT      -- 画面内で一意なID（data-cid属性と一致）
├─ name          TEXT      -- 例: LoginForm, SubmitButton
├─ type          TEXT      -- 例: form / button / table / nav
├─ note          TEXT      -- 本開発向けの補足（バリデーション要件など）

project_inputs（投入インプット）
├─ id, project_id, file_path, kind('企画書'|'要件メモ'|...), created_at

chat_sessions（画面ごとのAIセッション）
├─ id            TEXT PK
├─ screen_id     FK → screens（プロジェクト全体向けはNULL）
├─ agent_session_id TEXT   -- Claude Code側のセッションID（resume用）
├─ created_at

chat_messages（チャット履歴）
├─ id, session_id FK, role('user'|'assistant'|'tool'), content TEXT(JSON), created_at
```

### 4.3 将来のクラウドPostgreSQL移行

- スキーマ定義はDrizzleで記述しておき、移行時はdialectを`sqlite`→`pg`に差し替え＋マイグレーション生成。
- DBアクセスは `lib/db/repositories/` のリポジトリ層経由に限定し、Route Handlerから直接クエリを書かない。移行時の影響範囲をリポジトリ層に閉じ込める。
- ファイル実体（コード・サムネイル）は移行時にS3等のオブジェクトストレージへ。パス参照をURL参照に置き換えられるよう、DBには「相対パス」を保存する。

---

## 5. 画面設計

### 5.1 ルーティング

| パス | 画面 | 概要 |
|---|---|---|
| `/` | プロジェクト一覧 | カード形式の一覧。新規作成・複製・削除 |
| `/projects/[id]` | プロジェクトキャンバス | 中核画面。画面群が格子状に整列 |
| `/projects/[id]/settings` | プロジェクト設定 | ペルソナ・機能概要・インプット管理 |
| `/projects/[id]/screens/[screenId]` | 個別画面詳細 | プレビュー＋チャット＋コンポーネント一覧 |
| `/settings` | アプリ設定 | Claude Code連携状態・データ保存先など |
| `/preview/[projectId]/[screenId]` | （内部）プレビュー | iframe埋め込み用。workspaceの画面を単体レンダリング |

### 5.2 プロジェクトキャンバス（中核画面）

```
┌─────────────────────────────────────────────────────┐
│ ◀ プロジェクト名        [インプット追加] [画面追加] [⚙] │
├─────────────────────────────────────────────────────┤
│ ▼ 認証                                               │
│ ┌────────┐ ┌────────┐ ┌────────┐                    │
│ │ thumb  │ │ thumb  │ │ + 追加  │                    │
│ │ログイン │ │新規登録 │ │        │                    │
│ └────────┘ └────────┘ └────────┘                    │
│ ▼ メイン機能                                          │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│ │ thumb  │ │(生成中) │ │ thumb  │ │ thumb  │         │
│ │ダッシュ │ │一覧    │ │詳細    │ │設定    │          │
│ └────────┘ └────────┘ └────────┘ └────────┘         │
└─────────────────────────────────────────────────────┘
```

- **自由配置はしない**。CSS Gridによる固定格子。並び順は`sort_order`、行のまとまりは`group_name`（ドラッグで並び替えのみ可能）。
- 各カード: サムネイル＋画面名＋ステータスバッジ（提案中/生成中/生成済み/エラー）。生成中はスケルトン表示し、ポーリング or SSEで更新。
- カードクリックで個別画面詳細へ遷移。

### 5.3 個別画面詳細

```
┌──────────────────────────────┬──────────────────────┐
│ プレビュー（iframe）            │ チャット               │
│  [デスクトップ/タブレット/モバイル]│  ┌────────────────┐  │
│                              │  │ 履歴(ストリーミング)│  │
│  ┌────────────────────────┐  │  └────────────────┘  │
│  │  /preview/... を表示     │  │  [入力欄] [送信/停止]  │
│  └────────────────────────┘  │                      │
├──────────────────────────────┴──────────────────────┤
│ タブ: [コンポーネント一覧] [コード] [静的HTML] [画面情報]   │
└──────────────────────────────────────────────────────┘
```

- チャットで指示→Claude Codeが`workspace/`内のコードを編集→保存検知でプレビューを自動リロード→確定時にサムネイル・静的HTML・コンポーネント一覧を再生成。
- コンポーネント一覧タブはSE向け：`component_id`・型・補足を編集でき、本開発の設計書出力（Markdown/CSVエクスポート）に使う。

### 5.4 アプリ設定

- Claude Code連携: CLI検出状態（パス・バージョン）、認証状態（未ログインなら`claude /login`の案内）、使用モデル、許可ツールのポリシー表示
- データ保存先ディレクトリの表示・変更
- 接続テストボタン（後述のヘルスチェックを実行）

---

## 6. Claude Code連携の設計

### 6.1 接続方式

**Claude Agent SDK（TypeScript）** を Next.js のRoute Handler（Node.jsランタイム）から利用する。SDKはローカルにインストールされたClaude Code CLIを子プロセスとして起動するため、**ユーザーがClaude Codeでログイン済みであればサブスクリプション認証がそのまま使われ、APIキーは不要**。

```ts
// lib/agent/session.ts（概念コード — 実装時にSDK最新版のAPIを確認すること）
import { query } from "@anthropic-ai/claude-agent-sdk";

export async function* runScreenEdit(projectId: string, screenId: string,
                                     prompt: string, resumeSessionId?: string) {
  const workspace = getWorkspacePath(projectId);
  const stream = query({
    prompt,
    options: {
      cwd: workspace,                        // 編集対象をworkspaceに限定
      resume: resumeSessionId,               // 画面ごとのセッション継続
      allowedTools: ["Read", "Write", "Edit", "Glob", "Grep"],
      permissionMode: "acceptEdits",         // workspace内の編集は自動承認
      systemPrompt: buildScreenSystemPrompt(projectId, screenId),
    },
  });
  for await (const message of stream) yield message;   // SSEでUIへ中継
}
```

設計上の要点:

- **セッション管理**: 画面ごとに`chat_sessions.agent_session_id`を保持し、`resume`で文脈を維持。プロジェクトのインプット解析は別セッション。
- **コンテキスト注入**: プロジェクトの前提情報（ペルソナ・機能概要）は`workspace/CLAUDE.md`に自動生成して常時参照させる。設定変更時に再生成。
- **安全境界**: `cwd`をworkspaceに固定し、許可ツールをファイル操作系に限定。Bash等が必要になった場合も許可リストで明示制御。
- **ストリーミング**: Route HandlerからSSE（`text/event-stream`）でUIへ逐次配信。アシスタントのテキスト、ツール使用（どのファイルを編集したか）、完了/エラーをイベント種別で分ける。
- **ヘルスチェック**: 設定画面の「接続テスト」で、(1) CLIの存在 (2) バージョン (3) 認証済みか（軽量プロンプトを1回実行）を確認。
- **将来のAPI切替**: `lib/agent/`をインターフェース（`AgentClient`）で抽象化し、Claude Agent SDK実装とAnthropic API実装を差し替え可能にしておく。

### 6.2 画面生成パイプライン

```
インプット投入（企画書など）
  │ 1. 解析セッション: インプット＋前提情報を読ませ、
  │    画面一覧を構造化出力（name/description/group/主要コンポーネント案）
  ▼
screens に 'proposed' で一括登録 → キャンバスに枠（プレースホルダ）表示
  │ 2. 画面ごとに生成ジョブをキューイング（直列〜少数並列）
  │    Claude Code が workspace/app/screens/<id>/page.tsx を生成
  │    ・Tailwindでスタイリング
  │    ・主要要素に data-cid="<component_id>" を必ず付与（規約）
  ▼
status='generated' → キャプチャ処理
  │ 3. Playwrightで /preview/<projectId>/<screenId> を開き、
  │    ・フルページスクリーンショット → thumb.png
  │    ・レンダリング後DOM → snapshot.html
  │    ・[data-cid] 要素を走査 → screen_components へupsert
  ▼
キャンバスのサムネイル更新
```

- コンポーネントIDは「生成コードに`data-cid`属性を埋め込む規約」と「レンダリング結果からの抽出」の2段構えで、コードと管理情報のズレを防ぐ。
- チャット修正後も同じキャプチャ処理を再実行する（手動「確定」ボタン or 編集完了イベントで自動）。

---

## 7. ディレクトリ構成（本アプリのリポジトリ）

```
appcanvas/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                       # プロジェクト一覧
│  │  ├─ projects/[id]/page.tsx         # キャンバス
│  │  ├─ projects/[id]/settings/page.tsx
│  │  ├─ projects/[id]/screens/[screenId]/page.tsx
│  │  ├─ settings/page.tsx
│  │  ├─ preview/[projectId]/[screenId]/page.tsx   # iframe用プレビュー
│  │  └─ api/
│  │     ├─ projects/**                 # CRUD
│  │     ├─ screens/**                  # CRUD・キャプチャ
│  │     ├─ chat/route.ts               # SSE（Agent SDK中継）
│  │     └─ agent/health/route.ts       # 接続テスト
│  ├─ components/                       # アプリ本体のUIコンポーネント
│  ├─ lib/
│  │  ├─ db/                            # Drizzleスキーマ・リポジトリ層
│  │  ├─ agent/                         # AgentClient抽象＋Claude Code実装
│  │  ├─ capture/                       # Playwrightキャプチャ
│  │  └─ workspace/                     # workspace生成・CLAUDE.md生成
├─ electron/
│  ├─ main.ts                           # サーバー起動＋BrowserWindow
│  └─ preload.ts
├─ docs/                                # 本設計書ほか
└─ .claude/skills/                      # 開発用スキル（導入済み）
```

---

## 8. 開発ロードマップ

| マイルストーン | 内容 |
|---|---|
| **M1: 骨格** | Next.js雛形、Drizzle+SQLite、プロジェクトCRUD、プロジェクト一覧/設定画面、データディレクトリ管理 |
| **M2: キャンバスとプレビュー** | 画面CRUD、格子キャンバス、workspace生成、`/preview`レンダリング、Playwrightキャプチャ（サムネ/静的HTML/コンポーネント抽出） |
| **M3: Claude Code連携** | Agent SDK統合、設定画面のヘルスチェック、画面詳細のチャット（SSE）、インプット解析→画面一覧提案→一括生成パイプライン |
| **M4: Electron化と仕上げ** | standaloneビルドのElectron同梱、electron-builderで配布物作成、エクスポート機能（コンポーネント一覧/コード一式） |

### 主なリスクと対応

| リスク | 対応 |
|---|---|
| Agent SDKのAPI変化 | `lib/agent/`の抽象層に閉じ込める。実装着手時に最新ドキュメントを確認 |
| 生成画面のビルドエラー | プレビューはエラーバウンダリで捕捉し、エラー内容をチャットに自動フィードバックして自己修正させる |
| Electron同梱時のPlaywright | Chromiumバイナリの同梱サイズが大きい場合、ElectronのoffscreenレンダリングやCDP接続での代替を検討 |
| 同時編集の競合 | M1〜M4はシングルユーザー前提。プロジェクトフォルダ単位の排他（ロックファイル）のみ実装 |
