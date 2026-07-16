# .agent-hooks — エージェント共通フック

Claude Code と Codex CLI の両方で同じ実装規約を**強制**するためのフックスクリプト置き場。
両エージェントはフックの入出力仕様(stdin JSON / `permissionDecision: "deny"` 出力)が
互換のため、スクリプトをここで一元管理し、各エージェントの設定から参照する。

## 強制している規約

| スクリプト                       | イベント                       | 内容                                                                       |
| -------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| `block-non-pnpm.sh`              | `PreToolUse` (Bash)            | **pnpm 縛り**。`npm` / `yarn` / `bun` / `npx` / `pnpm dlx` の実行を拒否する |
| `block-lint-suppress.sh`         | `PreToolUse` (Edit/Write)      | **lint 無効化禁止**。`eslint-disable` / `biome-ignore` の追加を拒否する     |
| `block-new-dependency.sh`        | `PreToolUse` (Bash/Edit/Write) | **新規ライブラリ追加禁止**。`pnpm add`(`-D` 含む)・`package.json` への依存追加を拒否し、`pnpm install --frozen-lockfile` のみ許可する |
| `block-force-push.sh`            | `PreToolUse` (Bash)            | **強制プッシュ禁止**。`git push --force` / `-f` / `--force-with-lease` / `+refspec` を拒否する |
| `block-main-branch-changes.sh`   | `PreToolUse` (Bash/Edit/Write) | **main / master 直接変更禁止**。`main` / `master` チェックアウト中の `git commit` / `push` / `merge` / `rebase` / `reset` / `revert` / `cherry-pick` / `am` / `restore`、およびファイル編集を拒否する |
| `post-edit-lint.sh`              | `PostToolUse` (Edit/Write)     | **編集後の自動リント**。編集ファイルに ESLint 等を `--fix` 付きで実行し、残った診断を AI にフィードバックする |
| `check-test-rules.sh`            | `PostToolUse` (Edit/Write)     | **テスト規約検証**([rules/testing.md](../rules/testing.md))。describe 禁止・条件分岐禁止・`{対象名}.{カテゴリ}.test.ts` 命名をチェックし AI にフィードバックする |
| `pre-push-typecheck.sh`          | `PreToolUse` (Bash)            | **push 前の型チェック**。`git push` 前に `pnpm run typecheck` を実行し、型エラーがあれば push を拒否する |
| `pre-push-lint.sh`               | `PreToolUse` (Bash)            | **push 前の全体 lint**。`git push` 前にプロジェクト全体の lint を実行し、エラーがあれば push を拒否する |
| `pre-push-test-rules.sh`         | `PreToolUse` (Bash)            | **push 前の全体テスト規約検査**。全 `*.test.ts(x)` を検査し、違反があれば push を拒否する |

`post-edit-lint.sh` / `check-test-rules.sh` / `pre-push-*.sh` は
[d-market-typescript の typescript-rules-plugin](https://github.com/DIO0550/d-market) の hooks から
このリポジトリ向け(アプリ本体が `mahjong/` 配下)に適応して移植したもの。

## 配線

- **Claude Code**: [`.claude/settings.json`](../.claude/settings.json) の `hooks.PreToolUse` / `hooks.PostToolUse` から参照。
  パスは `$CLAUDE_PROJECT_DIR` 基準。
- **Codex CLI**: [`.codex/hooks.json`](../.codex/hooks.json) の `hooks.PreToolUse` / `hooks.PostToolUse` から参照。
  パスは `$CODEX_PROJECT_DIR` 基準。フック機能の有効化に
  [`.codex/config.toml`](../.codex/config.toml) の `[features] codex_hooks = true` が必要。

## 例外(エスケープハッチ)

- `block-lint-suppress.sh` は以下を許可する:
  - `useExhaustiveDependencies` / `react-hooks/exhaustive-deps`(useEffect マウント時)
  - 対象ファイルに `// @lint-suppress-ok` を記載した場合(本当に必要なときのみ)
- `block-non-pnpm.sh` に例外はない。パッケージは `pnpm add` でインストールしてから使用する。
- `block-new-dependency.sh` は以下のみ許可する:
  - `pnpm install --frozen-lockfile`(lockfile を変更しないインストール)
  - 環境変数 `AGENT_ALLOW_NEW_DEPS=1` を設定した場合(どうしても必要なときのみ)
  - `pnpm add`(`-D` を含む)・引数なしの `pnpm install`・`package.json` への依存追加はすべて禁止。
- `block-force-push.sh` に例外はない。リジェクトされた場合は `git pull --rebase origin <branch>` で取り込んでから push すること。
- `block-main-branch-changes.sh` に例外はない。`main` / `master` への変更は必ず作業ブランチを切ってから PR 経由で行う。
- テスト規約チェック(`check-test-rules.sh` / `pre-push-test-rules.sh`)は以下で個別に無効化できる:
  - ファイル単位: `// @test-rules-disable [no-describe|no-conditional|file-naming ...]`(引数なしで全ルール無効化)
  - プロジェクト単位: 最寄りの `.test-rules.yml` に `<ルール名>: false` を記載
- `pre-push-typecheck.sh` / `pre-push-lint.sh` / `post-edit-lint.sh` は node_modules 未インストール時(ツールが実行不能な場合)は黙ってスキップする。

## 動作確認

```bash
# 拒否されること(deny が出力される)
echo '{"tool_input":{"command":"npm install"}}' | bash .agent-hooks/block-non-pnpm.sh

# 許可されること(出力なし・exit 0)
echo '{"tool_input":{"command":"pnpm install"}}' | bash .agent-hooks/block-non-pnpm.sh
```
