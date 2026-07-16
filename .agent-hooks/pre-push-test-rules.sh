#!/usr/bin/env bash
#
# push 前の全体テストルール検査: git push の実行前に全テストファイルを
# rules/testing.md の規約で検査し、違反があれば push をブロックする PreToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
# 由来: d-market-typescript / typescript-rules-plugin の pre-push-test-rules.sh
#
# 検証ルール・無効化の方法は check-test-rules.sh（PostToolUse 版）と同一。
set -euo pipefail

# --- stdin から Bash コマンドを取得 ---
input="$(cat)"
command="$(jq -r '.tool_input.command // empty' <<< "$input")"

# git push 以外はスルー
if ! echo "$command" | grep -qE '(^|\s|[;&|])\s*git\s+push\b'; then
  exit 0
fi

# --- プロジェクトルートの解決（アプリ本体は mahjong/ 配下） ---
base="${CLAUDE_PROJECT_DIR:-${CODEX_PROJECT_DIR:-$PWD}}"
if [ -d "$base/mahjong" ]; then
  scan_root="$base/mahjong"
else
  scan_root="$base"
fi

# --- 設定ファイル (.test-rules.yml) を探索 ---
find_config() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.test-rules.yml" ]; then
      echo "$dir/.test-rules.yml"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

# YAML からフラット構造のルール値を読み取る
read_yaml_rule() {
  local config="$1" key="$2"
  local value
  value="$(grep -E "^\s+${key}:" "$config" 2>/dev/null | sed 's/.*:\s*//' | tr -d ' ')" || true
  if [ "$value" = "false" ]; then
    echo "false"
  else
    echo "true"
  fi
}

# --- 1ファイル分のテストルール違反を検出 ---
check_file() {
  local file="$1"
  local rule_no_describe=true rule_no_conditional=true rule_file_naming=true
  local config_file
  if config_file="$(find_config "$(dirname "$file")")"; then
    rule_no_describe="$(read_yaml_rule "$config_file" "no-describe")"
    rule_no_conditional="$(read_yaml_rule "$config_file" "no-conditional")"
    rule_file_naming="$(read_yaml_rule "$config_file" "file-naming")"
  fi

  # ファイルレベル無効化 (// @test-rules-disable [ルール名...])
  local disable_line
  disable_line="$(grep -m1 '@test-rules-disable' "$file" 2>/dev/null || true)"
  if [ -n "$disable_line" ]; then
    if echo "$disable_line" | grep -qE '@test-rules-disable\s*$'; then
      return 0
    fi
    echo "$disable_line" | grep -q 'no-describe' && rule_no_describe=false
    echo "$disable_line" | grep -q 'no-conditional' && rule_no_conditional=false
    echo "$disable_line" | grep -q 'file-naming' && rule_file_naming=false
  fi

  local file_violations=""

  # describe/context/suite の使用チェック
  if [ "$rule_no_describe" = "true" ]; then
    local matches
    matches="$(grep -nE '\b(describe|context|suite)\s*\(' "$file" | head -5 || true)"
    if [ -n "$matches" ]; then
      file_violations="${file_violations}[構造違反] ${file}: describe/context/suite の使用は禁止です。フラット構造（test() のみ）にしてください。
該当箇所:
${matches}

"
    fi
  fi

  # テストコード内の条件分岐チェック
  if [ "$rule_no_conditional" = "true" ]; then
    local matches
    matches="$(grep -nE '^\s*(if\s*\(|else\s*\{|else\s+if\s*\(|switch\s*\()' "$file" | head -5 || true)"
    if [ -n "$matches" ]; then
      file_violations="${file_violations}[条件分岐禁止] ${file}: テストコード内で if/else/switch は禁止です。test.each またはテストケースの分割で対応してください。
該当箇所:
${matches}

"
    fi
  fi

  # ファイル命名規則チェック
  if [ "$rule_file_naming" = "true" ]; then
    local basename
    basename="$(basename "$file")"
    if [[ ! "$basename" =~ ^[^.]+\.[^.]+\.test\.tsx?$ ]]; then
      file_violations="${file_violations}[命名規則] ${file}: テストファイル名は {テスト対象名}.{カテゴリ}.test.ts|tsx を推奨します（例: score.normal.test.ts）。

"
    fi
  fi

  printf '%s' "$file_violations"
}

# --- 対象ファイルを列挙して検査 ---
violations=""
while IFS= read -r file; do
  result="$(check_file "$file")" || true
  if [ -n "$result" ]; then
    violations="${violations}${result}"
  fi
done < <(find "$scan_root" \
  \( -path '*/node_modules' -o -path '*/dist' -o -path '*/.next' -o -path '*/build' -o -path '*/.git' \) -prune -o \
  -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) \
  -print)

if [ -n "$violations" ]; then
  jq -Rn --arg msg "$violations" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("push 前の全体テストルール検査で違反が検出されたため push をブロックしました。以下の違反をすべて修正してから再度 push してください。\n\n" + $msg + "\nルール: フラット構造（describeなし）、条件分岐禁止（test.eachを使用）、ファイル名は {対象名}.{カテゴリ}.test.ts|tsx")
    }
  }'
fi
