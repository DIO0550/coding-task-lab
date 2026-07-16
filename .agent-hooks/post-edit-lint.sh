#!/usr/bin/env bash
#
# 編集後の自動リントチェック: Edit / Write されたファイルに ESLint 等を実行し、
# 自動修正した上で残った診断結果を AI にフィードバックする PostToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
# 由来: d-market-typescript / typescript-rules-plugin の post-edit-lint.sh
set -euo pipefail

# --- stdin から編集されたファイルパスを取得 ---
input="$(cat)"
file="$(jq -r '.tool_input.file_path // .tool_input.path // empty' <<< "$input")"

# 対象拡張子のみ処理
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json) ;;
  *) exit 0 ;;
esac

# フック・設定自身は対象外
case "$file" in
  */node_modules/*|*/.next/*|*/.claude/*|*/.codex/*|*/.agent-hooks/*) exit 0 ;;
  node_modules/*|.next/*|.claude/*|.codex/*|.agent-hooks/*) exit 0 ;;
esac

# ファイルが存在しなければスキップ（削除の場合など）
[ -f "$file" ] || exit 0

# --- 指定した dep を持つ最寄りの package.json を探索 ---
# monorepo でサブパッケージに dep が無い場合、ルートまで遡る
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

# dep のあるルートから pnpm exec を実行
run_lint() {
  local root="$1"; shift
  (cd "$root" && pnpm exec "$@")
}

# ツールが実行可能か確認（node_modules 未インストール時は黙ってスキップ）
tool_available() {
  local root="$1" tool="$2"
  [ -d "$root/node_modules" ] || return 1
  (cd "$root" && pnpm exec "$tool" --version >/dev/null 2>&1)
}

diag=""
ran_lint=false
start_dir="$(dirname "$file")"

# --- oxlint (ESLint より高速な代替。両方あれば oxlint を優先) ---
if oxlint_root="$(find_dep_root "oxlint" "$start_dir")" && tool_available "$oxlint_root" oxlint; then
  run_lint "$oxlint_root" oxlint --fix "$file" >/dev/null 2>&1 || true
  result="$(run_lint "$oxlint_root" oxlint "$file" 2>&1 | head -30)" || true
  if [ -n "$result" ]; then
    diag="${diag}[oxlint]
${result}

"
  fi
  ran_lint=true
fi

# --- ESLint (oxlint が無い場合のフォールバック) ---
if [ "$ran_lint" = false ]; then
  if eslint_root="$(find_dep_root "eslint" "$start_dir")" && tool_available "$eslint_root" eslint; then
    run_lint "$eslint_root" eslint --fix "$file" >/dev/null 2>&1 || true
    result="$(run_lint "$eslint_root" eslint "$file" 2>&1 | head -30)" || true
    if [ -n "$result" ]; then
      diag="${diag}[eslint]
${result}

"
    fi
  fi
fi

# --- Biome (フォーマッター + リンター) ---
if biome_root="$(find_dep_root "@biomejs/biome" "$start_dir")" && tool_available "$biome_root" biome; then
  run_lint "$biome_root" biome check --fix "$file" >/dev/null 2>&1 || true
  result="$(run_lint "$biome_root" biome check "$file" 2>&1 | head -30)" || true
  if [ -n "$result" ]; then
    diag="${diag}[biome]
${result}

"
  fi
fi

# --- 診断結果をフィードバック ---
if [ -n "$diag" ]; then
  jq -Rn --arg msg "$diag" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("Lint diagnostics:\n" + $msg + "\nFix the remaining issues above.")
    }
  }'
fi
