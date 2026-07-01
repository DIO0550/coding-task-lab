# coding-task-lab

麻雀(リーチ麻雀・4人麻雀)の点数計算アプリケーション。

手牌・副露・和了牌などの状況から、和了判定・役判定・符計算・点数計算を行うエンジンと、
それを利用する Web UI を提供する。点数計算エンジンは Web UI からも CLI からも利用できる。

## 技術スタック

- フレームワーク: Next.js (App Router)
- 言語: TypeScript (strict mode)
- パッケージマネージャ: pnpm
- テスト: Vitest
- E2E / 表示確認: Playwright

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev            # 開発サーバーを起動
pnpm test           # テストを実行
pnpm lint           # Lint
```

## 点数計算 CLI

点数計算エンジンは CLI からも利用できる。標準入力に計算リクエストJSONを渡すと、
標準出力に計算結果JSONを返す。

```bash
echo '{"hand":["2m","3m","4m","5m","6m","7m","2p","3p","4p","5p","6p","7p","5s","5s"],"winTile":"7m","winType":"tsumo","seatWind":"nan","roundWind":"ton","riichi":"none"}' | pnpm --silent calc
```

入出力JSONのスキーマは [docs/spec-phase1.md](./docs/spec-phase1.md) を参照。

## Dev Container / Docker

DevContainer の Docker イメージとコンテナには固定名を付けているため、
VS Code 以外からも次のコマンドで入りやすくしている。

```bash
docker exec -it coding-task-lab-dev bash
```

必要に応じて、DevContainer の Compose 設定だけを直接起動することもできる。

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
```

- イメージ名: `coding-task-lab-devcontainer:latest`
- コンテナ名: `coding-task-lab-dev`

## ドキュメント

- 実装規約: [AGENTS.md](./AGENTS.md)(フォルダ構造・依存方向・テスト方針など)
- 機能仕様: [docs/spec-phase1.md](./docs/spec-phase1.md)

## ディレクトリ構成

```
src/
  app/         ルーティング層(Next.js App Router)
  features/    ユースケース単位
  domains/     ドメインオブジェクト
  services/    複数ドメインに跨るドメインロジック
  components/  汎用UIコンポーネント
  hooks/       汎用カスタムフック
  libs/        外部世界との境界(I/O)
  utils/       汎用純粋関数
  types/       型定義
```

詳細と各層の依存ルールは [rules/architecture.md](./rules/architecture.md) を参照。
