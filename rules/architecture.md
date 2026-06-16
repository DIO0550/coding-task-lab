# アーキテクチャ規約

## フォルダ構造(ドメイン + Feature ベース)

トップレベルおよび feature 内の構成は以下の通り。**各フォルダの内部をどうモジュール分割するかは実装者の設計判断に委ねる。**

```
src/
  app/         # ルーティング層: Next.js App Router の規約ファイルのみ(page/layout/route)。薄く保つ
  features/    # Feature 層: ユースケース単位(内部構成は後述)
  domains/     # ドメイン層: 複数 feature から使われるドメインオブジェクト(コンパニオンオブジェクト)
  services/    # ドメインサービス層: 複数ドメインに跨り、単一ドメインオブジェクトに帰属させられないドメインロジック
  components/  # 汎用UIコンポーネント(ドメイン知識を持たない)
  hooks/       # 汎用カスタムフック(ドメイン知識を持たない)
  libs/        # 外部世界との境界: 外部ライブラリのラップ、localStorage 等のI/O をここに閉じ込める
  utils/       # 汎用純粋関数(ドメイン知識を持たない)
  types/       # ロジックを持たない純粋な型定義のみ(コンパニオンオブジェクトを置いたら違反)
```

```
features/<feature-name>/
  domains/     # この feature 固有のドメインオブジェクト
  components/  # この feature 固有のUI
  hooks/       # この feature 固有のフック
  utils/       # この feature 固有のユーティリティ
  types/       # この feature 固有の型
```

## 配置の判断基準

- ドメインオブジェクトはまず `features/<x>/domains/` に置き、**2つ以上の feature が必要としたら `src/domains/` に昇格**させる(重複実装は禁止)
- 複数ドメインを組み合わせるロジックで、UIにもI/Oにも依存しないものは `src/services/`
- I/O(localStorage, fetch, 外部ライブラリ)は必ず `src/libs/` 経由

## モジュールの公開API

- モジュールフォルダ(domains/services/features の各サブフォルダ)は `index.ts` を公開APIとする
- フォルダ外部からの import は必ず `index.ts` 経由とし、**内部ファイルへの deep import は禁止**
- `index.ts` から export するのは外部に公開する必要があるものだけに絞る

## 依存方向のルール(必須要件)

```
app → features → services → domains
```

- `src/domains/<x>/` は他の domain を import してよい(一方向のみ・循環禁止)。services / features / React / Next.js への依存は禁止
- `src/services/` は `src/domains/` と `src/types/` と `src/utils/` のみ import 可。React / Next.js への依存は禁止
- `features/<x>/` は自分の内部、`src/services/`、`src/domains/`、横断層(`components/` `hooks/` `libs/` `utils/` `types/`)を import 可。**feature 間の import は禁止**
- `features/<x>/domains/` は `src/domains/` を import してよいが、他 feature の domains は不可
- `app/` はロジックを持たない。`features/` の呼び出しとルーティング定義のみ
- `components/` `hooks/` `utils/` `types/` は domains / services / features を import してはならない(ドメイン知識の流入禁止)
- `libs/` は外部ライブラリと `src/types/` のみ import 可
- 循環依存は全面禁止
