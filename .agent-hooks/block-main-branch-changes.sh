#!/usr/bin/env bash
#
# main / master ブランチでの直接変更を禁止する PreToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
#
# 方針: 共有ブランチへの直接コミット / プッシュ / マージ / リベース / リセット、
#       および main / master チェックアウト中のファイル編集を禁止する。
#       変更は必ず作業ブランチを切ってから行う。
#
# 入力: stdin に Bash / Edit / Write の tool_input を含む JSON
# 出力: 違反時に permissionDecision=deny の JSON を返す。問題なければ exit 0。
#
# 注意: コマンド文字列全体に対する単純な grep は、`git commit -m "...git reset..."`
#       のように引数の中に文字列が含まれるケースで誤検出する。そのため `&&` / `||` / `;` / `|`
#       で論理コマンドを分割し、各セグメントが実際に対象 git サブコマンド呼び出しになっているかを確認する。
set -euo pipefail

input="$(cat)"
tool_name="$(jq -r '.tool_name // empty' <<< "$input")"

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

# 現在のブランチを取得。git リポジトリでない / 取得不可なら何もしない。
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[ -z "$current_branch" ] && exit 0
case "$current_branch" in
  main|master) ;;
  *) exit 0 ;;
esac

case "$tool_name" in
  Bash)
    command="$(jq -r '.tool_input.command // empty' <<< "$input")"
    [ -z "$command" ] && exit 0

    # 論理コマンド境界で分割し、各セグメントの先頭コマンドのみを判定する。
    segments="$(echo "$command" | sed -E 's/(\|\||&&|;|\|)/\n/g')"
    while IFS= read -r seg; do
      trimmed="$(echo "$seg" | sed -E 's/^[[:space:]]+//')"
      [ -z "$trimmed" ] && continue

      # 履歴を書き換える / リモートに反映する git サブコマンドが「セグメントの先頭」になっている場合のみ拒否。
      # commit / push / merge / rebase / reset / revert / cherry-pick / am / restore
      if echo "$trimmed" | grep -qE '^git[[:space:]]+(-[^[:space:]]+[[:space:]]+)*(commit|push|merge|rebase|reset|revert|cherry-pick|am|restore)([[:space:]]|$)'; then
        deny "現在のブランチは '${current_branch}' です。main / master ブランチへの直接的な変更(commit / push / merge / rebase / reset 等)は禁止されています。まず作業ブランチを切ってから変更してください: git switch -c <feature-branch>"
      fi
    done <<< "$segments"
    ;;
  Edit|Write|MultiEdit|NotebookEdit)
    file="$(jq -r '.tool_input.file_path // .tool_input.path // .tool_input.notebook_path // empty' <<< "$input")"
    [ -z "$file" ] && exit 0

    deny "現在のブランチは '${current_branch}' です。main / master ブランチ上でのファイル編集は禁止されています。まず作業ブランチを切ってから編集してください: git switch -c <feature-branch>"
    ;;
  *)
    exit 0
    ;;
esac

exit 0
