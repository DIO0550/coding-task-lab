#!/usr/bin/env bash
#
# lint 無効化の禁止: Edit / Write で eslint-disable / biome-ignore などの
# lint 抑制コメントを新規追加することを禁止する PreToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
#
# 方針: lint エラーは「抑制」ではなく「コードの修正」で解決する。
# どうしても抑制が必要な場合のみ、対象ファイルに // @lint-suppress-ok を記載する。
set -euo pipefail

input="$(cat)"
file="$(jq -r '.tool_input.file_path // .tool_input.path // empty' <<< "$input")"

# 対象は JS/TS 系ソースのみ。
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

# 設定・依存・フック自身などは対象外。
case "$file" in
  */node_modules/*|*/.next/*|*/.claude/*|*/.codex/*|*/.agent-hooks/*) exit 0 ;;
  node_modules/*|.next/*|.claude/*|.codex/*|.agent-hooks/*) exit 0 ;;
esac

# ファイルに明示的なエスケープハッチがある場合は許可。
if [ -f "$file" ] && grep -qm1 '@lint-suppress-ok' "$file" 2>/dev/null; then
  exit 0
fi

tool_name="$(jq -r '.tool_name // empty' <<< "$input")"
case "$tool_name" in
  Write) content="$(jq -r '.tool_input.content // empty' <<< "$input")" ;;
  Edit)  content="$(jq -r '.tool_input.new_string // empty' <<< "$input")" ;;
  *)     exit 0 ;;
esac

[ -z "$content" ] && exit 0

# 抑制コメントを検出。
suppression_lines="$(echo "$content" | grep -nE 'biome-ignore|eslint-disable(-next-line|-line)?' || true)"
[ -z "$suppression_lines" ] && exit 0

# 許可される例外: useEffect の依存配列警告(マウント時のみ実行する正当なケース)。
filtered="$(echo "$suppression_lines" \
  | grep -v 'useExhaustiveDependencies' \
  | grep -v 'react-hooks/exhaustive-deps' \
  || true)"
[ -z "$filtered" ] && exit 0

jq -n --arg lines "$filtered" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("lint 抑制コメントの追加は禁止されています。\nlint エラーは抑制ではなく、コードを修正して解決してください。\n\n検出された禁止パターン:\n" + $lines + "\n\n許可されている例外:\n- useExhaustiveDependencies / react-hooks/exhaustive-deps (useEffect マウント時)\n\n上記以外でどうしても必要な場合のみ、対象ファイルに // @lint-suppress-ok を追加してください。")
  }
}'
exit 0
