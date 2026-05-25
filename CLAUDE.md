# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

agent-lab はエージェントの実験用モノレポ。各サブディレクトリが独立したプロジェクトとして存在する。

## Projects

### gomoku/
五目並べゲーム。Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4。

Feature ベースのフォルダ構成を採用：

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

- `app/` はルーティングと layout に専念し、ロジックは持たない
- `features/` に機能固有のものを全部入れる（components, hooks, types, logic 等）
- `features/` の外にあるものは feature 横断の共通コード

## Common Commands

各プロジェクトディレクトリ内で実行する：

```bash
# gomoku/
pnpm install              # 依存関係のインストール
pnpm run dev              # 開発サーバー起動
pnpm run build            # プロダクションビルド
pnpm run lint             # ESLint 実行（eslint-config-next/core-web-vitals + typescript）
pnpm run typecheck        # TypeScript 型チェック（tsc --noEmit）
pnpm run test             # Vitest 全テスト実行
pnpm run test パス        # 特定ファイルのテスト実行
```

## Development Environment

- パッケージマネージャ: **pnpm**
- DevContainer 設定あり（`.devcontainer/`）。ポート 13000 をフォワード
- パスエイリアス: `@/*` → プロジェクトルートからの相対パス（gomoku/tsconfig.json）
