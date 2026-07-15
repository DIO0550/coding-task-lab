#!/usr/bin/env bash
#
# push 前の全体 lint: git push の実行前にプロジェクト全体の lint を走らせ、
# エラーがあれば push をブロックする PreToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
# 由来: d-market-typescript / typescript-rules-plugin の pre-push-lint.sh
#
# 適応: このリポジトリのアプリ本体は mahjong/ 配下にあるため、
#       リポジトリルートに package.json が無い場合は mahjong/ を対象にする。
set -euo pipefail

# --- stdin から Bash コマンドを取得 ---
input="$(cat)"
command="$(jq -r '.tool_input.command // empty' <<< "$input")"

# git push 以外はスルー
if ! echo "$command" | grep -qE '(^|\s|[;&|])\s*git\s+push\b'; then
  exit 0
fi

# --- プロジェクトルートの解決 ---
base="${CLAUDE_PROJECT_DIR:-${CODEX_PROJECT_DIR:-$PWD}}"
if [ -f "$base/package.json" ]; then
  project_root="$base"
elif [ -f "$base/mahjong/package.json" ]; then
  project_root="$base/mahjong"
else
  exit 0
fi

# --- 指定した dep を持つ最寄りの package.json を探索 ---
find_dep_root() {
  local dep="$1" dir="$2"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/package.json" ] && \
       jq -e --arg name "$dep" '(.dependencies[$name] // .devDependencies[$name]) != null' "$dir/package.json" >/dev/null 2>&1; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

# ツールが実行可能か確認（node_modules 未インストール時は黙ってスキップ）
tool_available() {
  local root="$1" tool="$2"
  [ -d "$root/node_modules" ] || return 1
  (cd "$root" && pnpm exec "$tool" --version >/dev/null 2>&1)
}

diag=""
ran_lint=false

# --- oxlint (ESLint より高速な代替。両方あれば oxlint を優先) ---
if oxlint_root="$(find_dep_root "oxlint" "$project_root")" && tool_available "$oxlint_root" oxlint; then
  if ! result="$(cd "$oxlint_root" && pnpm exec oxlint 2>&1)"; then
    diag="${diag}[oxlint]
${result}

"
  fi
  ran_lint=true
fi

# --- ESLint (oxlint が無い場合のフォールバック) ---
if [ "$ran_lint" = false ]; then
  if eslint_root="$(find_dep_root "eslint" "$project_root")" && tool_available "$eslint_root" eslint; then
    if ! result="$(cd "$eslint_root" && pnpm exec eslint . 2>&1)"; then
      diag="${diag}[eslint]
${result}

"
    fi
  fi
fi

# --- Biome (フォーマッター + リンター) ---
if biome_root="$(find_dep_root "@biomejs/biome" "$project_root")" && tool_available "$biome_root" biome; then
  if ! result="$(cd "$biome_root" && pnpm exec biome check . 2>&1)"; then
    diag="${diag}[biome]
${result}

"
  fi
fi

# --- エラーがあれば push をブロックし、内容を AI にフィードバック ---
if [ -n "$diag" ]; then
  jq -Rn --arg msg "$diag" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("push 前の全体 lint でエラーが検出されたため push をブロックしました。以下の lint エラーをすべて修正してから再度 push してください。\n\n" + $msg)
    }
  }'
fi
