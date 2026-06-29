# コンポーネント規約

## Composition パターン

props が多くなったコンポーネントは、props を増やし続けるのではなく **Composition(合成)** で組み立てる。

### 判断基準

- props が概ね5個を超える、または真偽値 props(`showHeader`, `hasFooter` 等)で内部の出し分けが増えてきたら Composition を検討する
- 「設定を渡して中身を制御する」のではなく「中身を子要素として渡す」形に変える

```tsx
// NG: props で内部を出し分ける(props が際限なく増える)
<Card
  title="点数"
  showIcon
  iconType="yaku"
  footerText="合計"
  showFooter
  headerAlign="center"
/>

// OK: children で合成する
<Card>
  <Card.Header align="center">点数</Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>合計</Card.Footer>
</Card>
```

## 関連する部品は名前空間でまとめる

意味的にまとまりのある複合コンポーネントは、`Parent.Child` 形式(コンパウンドコンポーネント)で公開してよい。

```tsx
<Form>
  <Form.NameField />
  <Form.SelectField name="seatWind" />
  <Form.Submit>計算</Form.Submit>
</Form>
```

- 親が暗黙のコンテキスト(状態・スタイル)を提供し、子がそれを利用する関係のときに使う
- 子を `Parent.Child` として公開する(`<FormNameField />` のような独立公開より、所属が型と補完で明確になる)
- 単なる無関係な部品の寄せ集めに名前空間を付けない(濫用禁止)

## hooks と UI の分離(headless 原則)

**カスタムフックは JSX を返さない。** state・派生値・ハンドラ・(必要なら DOM に spread する) props オブジェクトだけを返し、JSX の組み立ては呼び出し側コンポーネントが行う。React Aria / TanStack Table / React Hook Form 等、英語圏の主要ライブラリが採る "headless" の方針に従う。

```typescript
// NG: hook が JSX を返す(UI 実装に縛られて再利用できない / テストしにくい / 毎レンダー JSX 生成)
function useEmailField() {
  const [value, setValue] = useState("");
  const field = <input value={value} onChange={(e) => setValue(e.target.value)} />;
  return { value, field };
}

// OK: 状態とハンドラだけを返し、JSX は呼び出し側で組む
function useEmailField() {
  const [value, setValue] = useState("");
  return {
    value,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
  };
}
```

- 公開する(再利用される)カスタムフックは必ず headless で書く。UI ライブラリ・マークアップを hook 側で固定しない
- 例外: **同一コンポーネント内の private な整理**目的で、外に export しない hook が JSX を返すのは許容(ただし `features/<x>/` の外には公開しない)
- 共有 UI(ダイアログ等)が必要なら、フックではなく**通常のコンポーネント**(必要なら Provider と組み合わせ)で提供する

## その他

- 1コンポーネント1責務。表示と状態管理・データ取得を同居させない(ロジックは hooks / services 側)
- ドメイン知識を持たない汎用コンポーネントは `src/components/`、feature 固有は `features/<x>/components/`
- props はオブジェクトで受け、必要最小限に絞る。使わない props を「将来のため」に足さない
- 真偽値 props よりも、状態を表す列挙(`variant="primary"` 等)を優先する
