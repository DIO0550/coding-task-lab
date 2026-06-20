#!/usr/bin/env bash
#
# pnpm 縛り: npm / yarn / bun / npx / pnpm dlx の使用を禁止する PreToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
#
# 入力: stdin に { "tool_input": { "command": "..." } } を含む JSON (Bash ツール呼び出し)
# 出力: 違反時に permissionDecision=deny の JSON を返す。問題なければ exit 0。
set -euo pipefail

input="$(cat)"
command="$(jq -r '.tool_input.command // empty' <<< "$input")"

[ -z "$command" ] && exit 0

# コマンドの先頭位置(行頭・パイプ・連結・サブシェル・xargs等の後)で禁止コマンドを検出する。
# 先頭境界: 行頭 / 空白 / ; | & ( のいずれか。
# pnpm は `\bnpm` に一致しない(p と n の間に語境界が無い)ため誤検出しない。
prefix='(^|[[:space:]]|[;&|(])'

deny() {
  local reason="$1"
  jq -n --arg reason "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# npx / pnpm dlx: 未インストールパッケージの即時実行を禁止
if echo "$command" | grep -qE "${prefix}(npx|pnpm[[:space:]]+dlx|bunx|yarn[[:space:]]+dlx)\b"; then
  deny "npx / pnpm dlx / bunx は禁止されています。パッケージは pnpm add でインストールしてから使用してください。"
fi

# npm / yarn / bun: パッケージマネージャは pnpm に統一
if echo "$command" | grep -qE "${prefix}(npm|yarn|bun)\b"; then
  deny "このリポジトリのパッケージマネージャは pnpm に統一されています。npm / yarn / bun は使用せず、pnpm を使用してください。(例: npm install → pnpm install, npm run X → pnpm run X)"
fi

exit 0
