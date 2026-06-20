#!/usr/bin/env bash
#
# 新規ライブラリ追加の禁止: 外部ランタイム依存の追加を禁止する PreToolUse フック。
# Claude Code (.claude/settings.json) と Codex (.codex/hooks.json) の両方から共有利用される。
#
# 規約 (CLAUDE.md): 外部ランタイム依存は原則禁止(Next.js / React 本体と devDependencies を除く)。
#
# 対象:
#   - Bash:        `pnpm add <pkg>` / `pnpm install <pkg>` (ランタイム依存の追加) を deny
#   - Edit/Write:  package.json の dependencies へのエントリ追加を deny
#
# 許可:
#   - `pnpm add -D` / `--save-dev` / `--save-peer` / `--save-optional` (devDependencies 等)
#   - `pnpm install` / `pnpm i` 単体 (lockfile からのインストール)
#
# エスケープハッチ: 環境変数 AGENT_ALLOW_NEW_DEPS=1 が設定されている場合は許可。
set -euo pipefail

# エスケープハッチ。
[ "${AGENT_ALLOW_NEW_DEPS:-}" = "1" ] && exit 0

input="$(cat)"

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

tool_name="$(jq -r '.tool_name // empty' <<< "$input")"

case "$tool_name" in
  Bash)
    command="$(jq -r '.tool_input.command // empty' <<< "$input")"
    [ -z "$command" ] && exit 0

    prefix='(^|[[:space:]]|[;&|(])'

    # dev/optional/peer 系のフラグが付いていれば devDependencies 等として許可。
    dev_flags='(-D|--save-dev|--dev|-O|--save-optional|--save-peer|--save-peer-deps)'
    has_dev_flag=false
    echo "$command" | grep -qE "${prefix}${dev_flags}([[:space:]]|$)" && has_dev_flag=true

    # `pnpm add <pkg>`: ランタイム依存の追加。
    if echo "$command" | grep -qE "${prefix}pnpm[[:space:]]+add\b"; then
      $has_dev_flag && exit 0
      deny "新規ライブラリ(ランタイム依存)の追加は禁止されています。

このリポジトリでは外部ランタイム依存は原則禁止です(Next.js / React 本体と devDependencies を除く)。
- 既存の依存・標準機能で実現できないか再検討してください。
- 開発用ツール(devDependencies)であれば 'pnpm add -D <pkg>' を使用してください。
- どうしても必要な場合は環境変数 AGENT_ALLOW_NEW_DEPS=1 を設定して実行してください。"
    fi

    # `pnpm install <pkg>` / `pnpm i <pkg>`: パッケージ指定での install も依存追加になる。
    # 引数なしの `pnpm install` / `pnpm i` (lockfile インストール) は許可する。
    if echo "$command" | grep -qE "${prefix}pnpm[[:space:]]+(install|i)[[:space:]]+[^-[:space:]]"; then
      $has_dev_flag && exit 0
      deny "パッケージ指定での 'pnpm install <pkg>' は新規ライブラリの追加に当たるため禁止されています。

- 依存をインストールするだけなら引数なしの 'pnpm install' を使用してください。
- 開発用ツールであれば 'pnpm add -D <pkg>' を使用してください。
- どうしても必要な場合は環境変数 AGENT_ALLOW_NEW_DEPS=1 を設定して実行してください。"
    fi

    exit 0
    ;;

  Edit|Write)
    file="$(jq -r '.tool_input.file_path // .tool_input.path // empty' <<< "$input")"
    case "$file" in
      */package.json|package.json) ;;
      *) exit 0 ;;
    esac
    case "$file" in
      */node_modules/*|node_modules/*) exit 0 ;;
    esac

    case "$tool_name" in
      Write) content="$(jq -r '.tool_input.content // empty' <<< "$input")" ;;
      Edit)  content="$(jq -r '.tool_input.new_string // empty' <<< "$input")" ;;
    esac
    [ -z "$content" ] && exit 0

    # 依存エントリらしき行を検出する。
    # 値がバージョン指定子(^ ~ >= 数字 workspace: npm: 等)で始まるものに限定し、
    # scripts セクション("build": "next build" 等)を誤検出しない。
    dep_lines="$(echo "$content" | grep -nE '"[^"]+"[[:space:]]*:[[:space:]]*"(\^|~|>=?|<=?|=|\*|workspace:|catalog:|npm:|file:|link:|github:|git\+|https?:|[0-9])' || true)"
    [ -z "$dep_lines" ] && exit 0

    deny "package.json への依存エントリの追加・変更を検出しました。

外部ランタイム依存は原則禁止です。package.json を直接編集して依存を追加せず、
- 開発用ツールであれば 'pnpm add -D <pkg>' を使用してください。
- どうしても必要な場合は環境変数 AGENT_ALLOW_NEW_DEPS=1 を設定して操作してください。

検出された行:
$dep_lines"
    ;;

  *)
    exit 0
    ;;
esac
