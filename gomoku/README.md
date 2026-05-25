# Gomoku（五目並べ）

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 で構築。

## フォルダ構成

```
gomoku/
├── app/                  # Next.js App Router（ルーティングのみ）
├── components/           # 共通UIコンポーネント
├── features/             # 機能・ドメイン単位
│   ├── board/
│   ├── game/
│   └── player/
├── hooks/                # 共通hooks
├── libs/                 # 外部ライブラリのラッパー等
├── types/                # 共通型定義
├── const/                # 共通定数
└── utils/                # 共通ユーティリティ
```

- **`app/`** はルーティングと layout に専念し、ロジックは持たない
- **`features/`** に機能固有のものを全部入れる（components, hooks, types, logic 等）
- `features/` の外にあるものは feature 横断で使う共通コード

## 開発

```bash
pnpm install              # 依存関係のインストール
pnpm run dev              # 開発サーバー起動
pnpm run build            # プロダクションビルド
pnpm run lint             # ESLint 実行
pnpm run typecheck        # TypeScript 型チェック（tsc --noEmit）
pnpm run test             # Vitest 全テスト実行
pnpm run test パス        # 特定ファイルのテスト実行
```
