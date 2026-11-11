/**
 * 在／不在の判別子のキー。export しないので、型の上ではこのファイルの外から名前を持てない。
 * 直列化の扱いは `Result.ts` の `OkTag` と同じ。
 */
const SomeTag: unique symbol = Symbol.for("coding-task-lab/utils/Option#some");

/** 値がある状態。 */
export type Some<T> = Readonly<{
  [SomeTag]: true;
  value: T;
}>;

/** 値が無い状態。 */
export type None = Readonly<{
  [SomeTag]: false;
}>;

/**
 * 値が無いことがありうる処理の戻り値（rules/coding.md「エラーと不在の表現」）。
 * `Option.isSome` で分岐すると、ある場合だけ `value` が読める。
 */
export type Option<T> = Some<T> | None;

/** 不在は状態を持たないので、生成せず 1 つを共有する。 */
const none: None = Object.freeze({ [SomeTag]: false as const });

/** `Option` の生成と連鎖。 */
export const Option = {
  none,

  /**
   * 値を持つ `Option` を作る。
   *
   * @param value 持たせる値。`null` / `undefined` は型で受けない（不在は `none` で表す）
   * @returns `value` を持つ `some`。凍結してあるので後から書き換えられない
   */
  some<T>(value: NonNullable<T>): Some<NonNullable<T>> {
    return Object.freeze({ [SomeTag]: true as const, value });
  },

  /**
   * `null` / `undefined` を不在とみなして `Option` にする。
   *
   * @param value 不在を `null` / `undefined` で表している値
   * @returns `null` / `undefined` なら `none`。それ以外（`0`・空文字・`false` を含む）は `some`
   */
  fromNullable<T>(value: T | null | undefined): Option<NonNullable<T>> {
    return value != null ? Option.some(value) : none;
  },

  /**
   * 値があれば変換する。
   *
   * @param option 変換元
   * @param fn 値があるときだけ呼ぶ変換
   * @returns `fn` の戻り値の `some`。`option` が `none` のときと、`fn` が `null` / `undefined`
   *   を返したときは `none`
   */
  map<T, U>(option: Option<T>, fn: (value: T) => U): Option<NonNullable<U>> {
    return option[SomeTag] ? Option.fromNullable(fn(option.value)) : none;
  },

  /**
   * 値があれば、不在になりうる次の処理へ渡す。
   *
   * @param option 渡す元
   * @param fn 値があるときだけ呼ぶ次の処理
   * @returns `option` が `none` なら `none`。値があれば `fn` の戻り値そのもの
   */
  flatMap<T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> {
    return option[SomeTag] ? fn(option.value) : none;
  },

  /**
   * 値があればそれ、無ければ代わりの値。
   *
   * @param option 先に見るほう
   * @param defaultValue `option` が `none` のときに返す値
   * @returns `option` の値。`none` なら `defaultValue`
   */
  unwrapOr<T>(option: Option<T>, defaultValue: T): T {
    return option[SomeTag] ? option.value : defaultValue;
  },

  /**
   * 値があればそれ、無ければ代わりの `Option`。
   *
   * @param option 先に見るほう
   * @param fallback `option` が `none` のときに答えるほう
   * @returns `option` が値を持てばそれ。持たなければ `fallback` をそのまま返すので、
   *   両方 `none` なら `none`
   */
  or<T>(option: Option<T>, fallback: Option<T>): Option<T> {
    return option[SomeTag] ? option : fallback;
  },

  /**
   * 値を持っているか。
   *
   * @param option 中身を見る `Option`
   * @returns 値を持っていれば `true`。`none` なら `false`
   */
  isSome<T>(option: Option<T>): option is Some<T> {
    return option[SomeTag];
  },

  /**
   * その値を持っているか。
   *
   * @param option 中身を見る `Option`
   * @param value 持っていてほしい値
   * @returns 値を持っていて、それが `value` と等しければ `true`。`none` なら `false`
   */
  contains<T>(option: Option<T>, value: T): boolean {
    return option[SomeTag] && option.value === value;
  },

  /**
   * 2 つの `Option` が同じものを表しているか。中身の比べ方は呼び出し側が渡す。
   *
   * @param option 比べる `Option`
   * @param other 比べる `Option`
   * @param equalsValue どちらも値を持つときに、2 つの値を比べる関数
   * @returns どちらも `none` なら `true`。どちらも値を持てば `equalsValue` の答え。片方だけ
   *   値を持つなら `false`
   */
  equals<T>(
    option: Option<T>,
    other: Option<T>,
    equalsValue: (value: T, otherValue: T) => boolean,
  ): boolean {
    if (option[SomeTag] && other[SomeTag]) {
      return equalsValue(option.value, other.value);
    }
    return option[SomeTag] === other[SomeTag];
  },

  /**
   * Some の値を取り出す。None の場合は例外を投げる。
   * 分岐せず値を前提にしてよいのは、失敗をそのままテストの失敗にしたいテストコードだけ
   * （`Result.unwrap` と同じ位置づけ / rules/coding.md）。
   *
   * @param option 値を持っているはずの `Option`
   * @returns `option` の値
   * @throws `option` が `none` のとき
   */
  unwrap<T>(option: Option<T>): T {
    if (!option[SomeTag]) {
      throw new Error("cannot unwrap a None option");
    }
    return option.value;
  },
} as const;
