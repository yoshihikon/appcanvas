# AppCanvas

アプリケーションの画面をデザインし、本開発に向けて管理していくためのローカルツール。

- 仕様: [docs/SPECIFICATION.md](docs/SPECIFICATION.md)
- 中身は Next.js、配布時は Electron でローカル起動（M4で対応予定）
- 画面の生成・修正はユーザーが契約している Claude Code と連携（M3で対応予定）

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000 で起動します。

データは既定で `~/.appcanvas` に保存されます。環境変数 `APPCANVAS_DATA_DIR`
で変更できます。

### サムネイル生成（キャプチャ）について

画面のサムネイル生成は Playwright（playwright-core）で Chromium を起動して
行います。ブラウザは同梱しないため、以下のいずれかが必要です。

- Google Chrome をインストールしておく（既定で利用）
- もしくは環境変数 `APPCANVAS_CHROMIUM_PATH` に Chromium 実行ファイルのパスを指定

ブラウザが無くてもアプリ自体は動作し、キャプチャ実行時にのみエラーになります。

### AI画面生成について

「AIで画面を生成」は、ローカルの Claude Code を Claude Agent SDK 経由で駆動します
（ログイン済みであればサブスクリプション認証が使われ、APIキーは不要）。

Claude Code を使わずにフロー全体（構成案→レビュー→順次生成→サムネ反映）を
確認したい場合は、モックエージェントを使えます。

```bash
APPCANVAS_AGENT=mock npm run dev
```

## 実装状況

| マイルストーン | 状態 |
|---|---|
| M1: 骨格（プロジェクト/画面CRUD・キャンバス・設定） | ✅ |
| M2: プレビューとキャプチャ（サムネイル・静的HTML・コンポーネント抽出） | ✅ |
| M3: Claude Code 連携によるAI画面生成（構成案→レビュー→順次生成） | ✅ |
| M3+: 画面個別のチャット修正・インプットファイル解析 | 未着手 |
| M4: Electron 化・エクスポート | 未着手 |
