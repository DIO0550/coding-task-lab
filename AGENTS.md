# AGENTS.md — 実装規約

このリポジトリで実装を行うAIエージェントは、以下の規約に**必ず**従うこと。
各規約は `rules/` 配下にあり、以下の `@` import で常にコンテキストへ読み込まれる。

## プロジェクト構成

- フレームワーク: Next.js (App Router)
- 言語: TypeScript (strict mode)
- パッケージマネージャ: pnpm
- テスト: Vitest / E2E・表示確認: Playwright
- 外部ランタイム依存: **原則禁止**(Next.js / React 本体と devDependencies を除く)

## 規約一覧

- @rules/architecture.md — フォルダ構造・依存方向・配置の判断基準
- @rules/coding.md — コンパニオンオブジェクトパターン・イミュータブル・禁止事項
- @rules/testing.md — テスト配置・テストの書き方(ネスト禁止)
- @rules/hooks.md — useEffect / useState / useReducer / カスタムフックの使い方
- @rules/components.md — コンポーネント設計(Composition パターン)
- @rules/ui-verification.md — UIの表示確認手順(playwright-cli)
- [rules/cli-contract.md](./rules/cli-contract.md) — 点数計算エンジンのCLI入出力契約（※ファイル未作成のため import 対象外）

## 仕様

機能仕様は以下を参照。

| ファイル                                                       | 内容                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| [docs/spec-phase1.md](./docs/spec-phase1.md)                   | 点数計算エンジン + ゲーム進行・CPU対局エンジン(実際にCPUと対戦できること) |
| [docs/spec-match-screen.md](./docs/spec-match-screen.md)       | 対戦画面(対戦開始設定・対局操作・結果表示・点数反映)     |

仕様の解釈に迷った場合は、判断と根拠を `docs/assumptions.md` に記録すること。

## Common Commands

各プロジェクトディレクトリ内で実行する：

```bash
# mahjong/
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
- パスエイリアス: `@/*` → プロジェクトルートからの相対パス（mahjong/tsconfig.json）
