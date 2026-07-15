#!/usr/bin/env bash
#
# テストルール検証: 編集されたテストファイルが rules/testing.md の規約に従っているかを
# 検証し、違反を AI にフィードバックする PostToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
# 由来: d-market-typescript / typescript-rules-plugin の check-test-rules.sh
#
# 検証ルール:
#   - no-describe:      describe/context/suite 禁止（フラット構造。rules/testing.md「ネスト禁止」）
#   - no-conditional:   テストコード内の if/else/switch 禁止（test.each を使用）
#   - file-naming:      {テスト対象}.{カテゴリ}.test.ts|tsx 形式
#
# 無効化:
#   - プロジェクト: 最寄りの .test-rules.yml（rules: 配下に <ルール名>: false）
#   - ファイル:     // @test-rules-disable [ルール名...]（引数なしで全ルール無効化）
set -euo pipefail

# --- stdin から編集されたファイルパスを取得 ---
input="$(cat)"
file="$(jq -r '.tool_input.file_path // .tool_input.path // empty' <<< "$input")"

# テストファイルのみ対象
case "$file" in
  *.test.ts|*.test.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

# --- 設定の読み込み ---
# プロジェクトレベル: 最寄りの .test-rules.yml を探索
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

# YAML から特定ルールの値を読み取る（フラット構造前提）
# 例: "  no-describe: false" → "false"
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

# ルールごとの有効/無効フラグ（デフォルト: 全て有効）
rule_no_describe=true
rule_no_conditional=true
rule_file_naming=true

config_file="$(find_config "$(dirname "$file")")" || true
if [ -n "$config_file" ]; then
  rule_no_describe="$(read_yaml_rule "$config_file" "no-describe")"
  rule_no_conditional="$(read_yaml_rule "$config_file" "no-conditional")"
  rule_file_naming="$(read_yaml_rule "$config_file" "file-naming")"
fi

# ファイルレベル: コメントで個別ルールを無効化
#   // @test-rules-disable no-describe no-conditional file-naming
#   // @test-rules-disable (全ルール無効化)
disable_line="$(grep -m1 '@test-rules-disable' "$file" 2>/dev/null || true)"
if [ -n "$disable_line" ]; then
  if echo "$disable_line" | grep -qE '@test-rules-disable\s*$'; then
    exit 0
  fi
  echo "$disable_line" | grep -q 'no-describe' && rule_no_describe=false
  echo "$disable_line" | grep -q 'no-conditional' && rule_no_conditional=false
  echo "$disable_line" | grep -q 'file-naming' && rule_file_naming=false
fi

violations=""

# --- describe/context/suite の使用チェック ---
if [ "$rule_no_describe" = "true" ]; then
  if grep -nE '\b(describe|context|suite)\s*\(' "$file" | head -5 | grep -q .; then
    matches="$(grep -nE '\b(describe|context|suite)\s*\(' "$file" | head -5)"
    violations="${violations}[構造違反] describe/context/suite の使用は禁止です。フラット構造（test() のみ）にしてください。
該当箇所:
${matches}

"
  fi
fi

# --- テストコード内の条件分岐チェック ---
if [ "$rule_no_conditional" = "true" ]; then
  if grep -nE '^\s*(if\s*\(|else\s*\{|else\s+if\s*\(|switch\s*\()' "$file" | head -5 | grep -q .; then
    matches="$(grep -nE '^\s*(if\s*\(|else\s*\{|else\s+if\s*\(|switch\s*\()' "$file" | head -5)"
    violations="${violations}[条件分岐禁止] テストコード内で if/else/switch は禁止です。test.each またはテストケースの分割で対応してください。
該当箇所:
${matches}

"
  fi
fi

# --- ファイル命名規則チェック ---
if [ "$rule_file_naming" = "true" ]; then
  basename="$(basename "$file")"
  if [[ ! "$basename" =~ ^[^.]+\.[^.]+\.test\.tsx?$ ]]; then
    violations="${violations}[命名規則] テストファイル名は {テスト対象名}.{カテゴリ}.test.ts|tsx を推奨します（例: score.normal.test.ts）。カテゴリ例: normal, edge, yakuman
現在のファイル名: ${basename}

"
  fi
fi

# --- 違反があればフィードバック ---
if [ -n "$violations" ]; then
  jq -Rn --arg msg "$violations" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("テストルール違反を検出しました。以下を修正してください:\n\n" + $msg + "\nルール: フラット構造（describeなし）、条件分岐禁止（test.eachを使用）、ファイル名は {対象名}.{カテゴリ}.test.ts|tsx")
    }
  }'
fi
