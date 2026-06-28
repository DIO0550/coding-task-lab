# Hooks 規約

## useEffect: 最終手段として扱う

useEffect は「外部システムとの同期」専用。React 公式 "You Might Not Need an Effect" に従い、外部システムが関与しない useEffect は禁止する。

### 禁止パターン

```typescript
// NG: props/state から導出できる値を Effect で state に書き戻す
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// OK: レンダー中に計算する(導出値は state にしない)
const fullName = `${firstName} ${lastName}`;
```

- **導出可能な値の state 化禁止**: レンダー中に計算できるものは計算する。重い計算のキャッシュは `useMemo`
- **イベント起因の処理を Effect に書かない**: ユーザー操作への応答(計算実行、通知など)はイベントハンドラに書く
- **state リセット目的の Effect 禁止**: コンポーネントツリーのリセットは `key` の変更で行う
- **Effect チェーン禁止**: ある Effect が state を更新し、それが別の Effect を発火させる連鎖は設計の誤り

### 許可されるケース

- ブラウザ API・外部ライブラリとの同期(必ず `libs/` のラッパー経由)
- 購読の開始/解除(クリーンアップ関数を必ず返す)

## useState / useReducer の使い分け

**判断基準: 1つの処理(ユーザー操作・イベント)が複数の state を更新するなら `useReducer` を使う。**

| 状況 | 使うもの |
|---|---|
| 単一の独立した値(入力値、トグル、選択中の項目) | `useState` |
| 1つの処理が複数の state を同時に更新する / 前の state から次の state を計算する / 更新パターン(アクション)が複数ある | `useReducer` |

- 1つのイベントハンドラ内で複数の setter を順に呼ぶ実装は禁止。それは state が連動しているサインなので、`useReducer` で1つの state + アクションに統合する
- reducer は**純粋関数**としてフックの外(またはファイル外)に定義する。reducer 内での I/O・副作用は禁止
- reducer 内にドメイン知識を書かない。状態遷移の中でドメイン計算が必要な場合は `domains/`(コンパニオンオブジェクト)/ `services/` の関数を呼び出す

```typescript
// OK: reducer はアクションの解釈に徹し、計算は services に委譲する
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "declare_win":
      return { ...state, result: ScoreService.calculate(state.hand, action.context) };
    // ...
  }
}
```

## hooks はドメインロジックを持たない

hooks(useState の更新ロジック、reducer、カスタムフック、イベントハンドラを含む)の責務は**状態の保持と UI イベントの仲介のみ**。ドメインロジック(判定・計算・変換)は必ずコンパニオンオブジェクト(`domains/`)または `services/` 側で管理し、hooks はそれを呼び出すだけにする。

```typescript
// NG: hook 内にドメインロジック(和了判定)を直接書く
function useGame() {
  const [hand, setHand] = useState<Hand>(initialHand);
  const canWin = hand.tiles.length === 14 && /* 面子分解のロジックがここに… */;
  // ...
}

// OK: 判定はコンパニオンオブジェクトに委譲し、hook は状態と接続だけ
function useGame() {
  const [hand, setHand] = useState<Hand>(initialHand);
  const canWin = Hand.isWinningShape(hand);
  // ...
}
```

判定基準: **その処理は React がなくても意味を持つか?** 持つならドメインロジックなので hooks に書いてはならない。

## document / window へのイベントリスナー

**要素の props で済むイベントを document / window に張ることは禁止。** イベントは原則、対象要素の props(`onClick`, `onKeyDown`, `onChange` 等)で処理する。

```typescript
// NG: 特定ボタンのクリック処理を document に張る
useEffect(() => {
  const handler = (e: MouseEvent) => {
    if ((e.target as HTMLElement).id === "calc-button") { /* ... */ }
  };
  document.addEventListener("click", handler);
  return () => document.removeEventListener("click", handler);
}, []);

// OK: 要素の props で処理する
<button onClick={handleCalc}>計算</button>
```

- `document` / `window` への addEventListener が許されるのは、**本質的にグローバルな関心事のみ**: `resize`、ページ全体のキーボードショートカット、要素外クリックの検知など
- その場合も必ず useEffect 内で登録し、クリーンアップ関数で解除すること(解除漏れは違反)
- グローバルリスナーが必要なロジックはカスタムフックに切り出すこと(コンポーネント内に直書きしない)

## useRef の使い分け

**判定軸: render で読むなら `useState`、event handler / 同期処理の内側だけで使うなら `useRef`。** React 公式 `useRef` リファレンス("Information that's used for rendering should be state instead")に従う。

```typescript
// NG: render に出る値を ref で持つ(再レンダーが走らずスピナーが出ない / 規約違反)
const isLoadingRef = useRef(false);
return <>{isLoadingRef.current && <Spinner />}</>;

// OK: render に出る情報は state
const [isLoading, setIsLoading] = useState(false);
return <>{isLoading && <Spinner />}</>;
```

### 禁止パターン: ref をフラグにした「防御」

- **二重発火防止の `hasFetchedRef` 禁止**: StrictMode の二重実行を ref で抑えにいかない。「防ぐ」のではなく「結果を捨てる」が公式設計。`useEffect` 内で `let ignore = false` を宣言し、cleanup で `ignore = true` にする(必要なら `AbortController` で実リクエストもキャンセル)
- **ローディング状態を `isLoadingRef` で持たない**: スピナー・`disabled`・エラー UI に出すなら `useState` 一択
- **連打防止の `inFlightRef` 禁止**: ボタンなら `useState` + `disabled` 属性が第一選択(DOM レベルで二重発火を遮断できる)
- カスタムフックがハンドラを返す場合も同じ。フック内で `useState` を持ち、`isSubmitting` 等を一緒に返して呼び出し側で `disabled` に流す

```typescript
// NG: ref で連打防止
const inFlightRef = useRef(false);
const handleClick = async () => {
  if (inFlightRef.current) return;
  inFlightRef.current = true;
  try { await submit(); } finally { inFlightRef.current = false; }
};

// OK: useState + disabled
const [isSubmitting, setIsSubmitting] = useState(false);
const handleClick = async () => {
  setIsSubmitting(true);
  try { await submit(); } finally { setIsSubmitting(false); }
};
return <button onClick={handleClick} disabled={isSubmitting}>送信</button>;
```

### `useRef` が正当な場面

- `AbortController` 等、**render では読まず、event handler 内でだけ参照する mutable な値**の保持(例: 検索の最後の入力だけ反映するため、新呼び出しで前を abort する)
- DOM 要素への参照(フォーカス操作・スクロール制御など、React の外に出る用途)
- `disabled` 属性で受けられないグローバル `keydown` 連打防止

判断基準: **その値は JSX のどこかで読むか?** 読むなら state、読まないなら ref。

## カスタムフック

- 命名は `useXxx`。1フック1責務
- features/コンポーネント内で同じ hook ロジックが2箇所に現れたらカスタムフックに抽出する
- 配置: `src/hooks/` は汎用のみ。feature 固有のものは `features/<x>/hooks/`(ドメインロジック禁止は前セクションの通り)
- 戻り値は使う側が必要とする最小限に絞る

## 共通

- 依存配列を欺く実装(意図的な依存の省略、`eslint-disable` での抑制)は禁止
- フックの条件付き呼び出し禁止(Rules of Hooks 準拠)
