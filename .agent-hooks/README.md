# .agent-hooks — エージェント共通フック

Claude Code と Codex CLI の両方で同じ実装規約を**強制**するためのフックスクリプト置き場。
両エージェントはフックの入出力仕様(stdin JSON / `permissionDecision: "deny"` 出力)が
互換のため、スクリプトをここで一元管理し、各エージェントの設定から参照する。

## 強制している規約

| スクリプト                | イベント                      | 内容                                                                       |
| ------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| `block-non-pnpm.sh`       | `PreToolUse` (Bash)           | **pnpm 縛り**。`npm` / `yarn` / `bun` / `npx` / `pnpm dlx` の実行を拒否する |
| `block-lint-suppress.sh`  | `PreToolUse` (Edit/Write)     | **lint 無効化禁止**。`eslint-disable` / `biome-ignore` の追加を拒否する     |

## 配線

- **Claude Code**: [`.claude/settings.json`](../.claude/settings.json) の `hooks.PreToolUse` から参照。
  パスは `$CLAUDE_PROJECT_DIR` 基準。
- **Codex CLI**: [`.codex/hooks.json`](../.codex/hooks.json) の `hooks.PreToolUse` から参照。
  パスは `$CODEX_PROJECT_DIR` 基準。フック機能の有効化に
  [`.codex/config.toml`](../.codex/config.toml) の `[features] codex_hooks = true` が必要。

## 例外(エスケープハッチ)

- `block-lint-suppress.sh` は以下を許可する:
  - `useExhaustiveDependencies` / `react-hooks/exhaustive-deps`(useEffect マウント時)
  - 対象ファイルに `// @lint-suppress-ok` を記載した場合(本当に必要なときのみ)
- `block-non-pnpm.sh` に例外はない。パッケージは `pnpm add` でインストールしてから使用する。

## 動作確認

```bash
# 拒否されること(deny が出力される)
echo '{"tool_input":{"command":"npm install"}}' | bash .agent-hooks/block-non-pnpm.sh

# 許可されること(出力なし・exit 0)
echo '{"tool_input":{"command":"pnpm install"}}' | bash .agent-hooks/block-non-pnpm.sh
```
