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

## 実装状況

| マイルストーン | 状態 |
|---|---|
| M1: 骨格（プロジェクト/画面CRUD・キャンバス・設定） | ✅ |
| M2: プレビューとキャプチャ（サムネイル・静的HTML・コンポーネント抽出） | 未着手 |
| M3: Claude Code 連携（チャット修正・インプット解析・画面生成） | 未着手 |
| M4: Electron 化・エクスポート | 未着手 |
