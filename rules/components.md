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

## その他

- 1コンポーネント1責務。表示と状態管理・データ取得を同居させない(ロジックは hooks / services 側)
- ドメイン知識を持たない汎用コンポーネントは `src/components/`、feature 固有は `features/<x>/components/`
- props はオブジェクトで受け、必要最小限に絞る。使わない props を「将来のため」に足さない
- 真偽値 props よりも、状態を表す列挙(`variant="primary"` 等)を優先する
