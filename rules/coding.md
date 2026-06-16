# コーディング規約

## コンパニオンオブジェクトパターン

ドメインロジックは**ドメインオブジェクト自身に閉じ込める**。
型と同名の const オブジェクトを定義し、生成・判定・変換ロジックをそこに集約する。

```typescript
// 例(汎用)
export type Money = Readonly<{
  amount: number;
  currency: "JPY" | "USD";
}>;

export const Money = {
  create(amount: number, currency: Money["currency"]): Money { /* バリデーション込み */ },
  add(a: Money, b: Money): Money { /* ... */ },
  isNegative(money: Money): boolean { /* ... */ },
} as const;
```

## ルール

- ドメインの型はすべて `Readonly` / イミュータブル
- 単一ドメインオブジェクトに帰属するロジック(判定・計算・変換)はコンパニオンオブジェクトのメソッドとして実装する
- 複数ドメインに跨るロジックは `services/` に置く。features 層にドメイン知識(例: 么九牌の定義、符の丸め規則)を書いてはならない
- features 層の責務は「services / domains のオーケストレーションとUI」のみ
- class は使用しない(type + companion object で統一)

## 禁止事項

- 既存の麻雀計算ライブラリ(riichi 等)への依存
- `any` の使用
- `domains/` `services/` での I/O(console, fs, localStorage, fetch 等)— I/O は `libs/` のみ
