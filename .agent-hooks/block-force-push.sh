#!/usr/bin/env bash
#
# 強制プッシュの禁止: `git push --force` / `-f` / `--force-with-lease` を拒否する PreToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
#
# 方針: 履歴の上書きはリモート側の変更を消し去る破壊的操作。
#       通常の `git push` でリジェクトされた場合も、まず `git pull --rebase` で取り込んでから push する。
#
# 入力: stdin に { "tool_input": { "command": "..." } } を含む JSON (Bash ツール呼び出し)
# 出力: 違反時に permissionDecision=deny の JSON を返す。問題なければ exit 0。
#
# 注意: コマンド文字列全体に対する単純な grep は、`git commit -m "...git push --force..."`
#       のように引数の中に文字列が含まれるケースで誤検出する。そのため `&&` / `||` / `;` / `|`
#       で論理コマンドを分割し、各セグメントが実際に `git push` 呼び出しになっているかを確認する。
set -euo pipefail

input="$(cat)"
command="$(jq -r '.tool_input.command // empty' <<< "$input")"

[ -z "$command" ] && exit 0

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

# 論理コマンド境界 (`&&` `||` `;` `|`) で分割。クォート内の境界は分割対象外にできないが、
# `git push` がセグメントの「先頭コマンド」になっているかをさらに判定することで誤検出を防ぐ。
segments="$(echo "$command" | sed -E 's/(\|\||&&|;|\|)/\n/g')"

while IFS= read -r seg; do
  # 先頭の空白を除去。
  trimmed="$(echo "$seg" | sed -E 's/^[[:space:]]+//')"
  [ -z "$trimmed" ] && continue

  # セグメントが `git [グローバルオプション]* push` で始まるもののみを対象。
  echo "$trimmed" | grep -qE '^git[[:space:]]+(-[^[:space:]]+[[:space:]]+)*push([[:space:]]|$)' || continue

  # --force / -f / --force-with-lease を検出。
  if echo "$trimmed" | grep -qE '(^|[[:space:]])(--force(-with-lease)?(=[^[:space:]]*)?|-f)([[:space:]]|$)'; then
    deny "強制プッシュ (git push --force / -f / --force-with-lease) は禁止されています。リモートの履歴を上書きする操作は他のコラボレーターの変更を破壊する可能性があります。リジェクトされた場合はまず git pull --rebase origin <branch> で取り込んでから push してください。"
  fi

  # `+refspec` (例: `git push origin +main`) も強制プッシュ相当として拒否。
  if echo "$trimmed" | grep -qE '(^|[[:space:]])\+[A-Za-z0-9_./-]+(:[A-Za-z0-9_./-]+)?([[:space:]]|$)'; then
    deny '強制プッシュ相当の refspec (+<branch>) は禁止されています。`git push origin <branch>` のように `+` を付けずに push してください。'
  fi
done <<< "$segments"

exit 0
