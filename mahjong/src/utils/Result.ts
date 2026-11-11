/**
 * 成否の判別子のキー。export しないので、型の上ではこのファイルの外から名前を持てない。
 *
 * シンボルのキーは `JSON.stringify` / `structuredClone` で落ちるので、直列化するなら
 * `libs/` の境界で詰め替える（`Option` の判別子も同じ）。
 */
const OkTag: unique symbol = Symbol.for("coding-task-lab/utils/Result#ok");

/** 成功した結果。処理が返した値を持つ。 */
export type Ok<T> = Readonly<{
  [OkTag]: true;
  value: T;
}>;

/** 失敗した結果。 */
export type Err<E> = Readonly<{
  [OkTag]: false;
  error: E;
}>;

/**
 * 失敗しうる処理の戻り値（rules/coding.md「エラーと不在の表現」）。
 * `Result.isOk` で分岐すると、成功なら `value`、失敗なら `error` だけが読める。
 */
export type Result<T, E> = Ok<T> | Err<E>;

/** `Result` の生成と連鎖。 */
export const Result = {
  /**
   * 成功した結果を作る。
   *
   * @param value 成功として持たせる値。`Option.some` と違い `undefined` でもよい（不在の
   *   意味を持たない）
   * @returns `value` を持つ `ok`。凍結してあるので後から書き換えられない
   */
  ok<T>(value: T): Ok<T> {
    return Object.freeze({ [OkTag]: true as const, value });
  },

  /**
   * 失敗した結果を作る。
   *
   * @param error 失敗の中身。呼び出し側はこれを見て分岐する
   * @returns `error` を持つ `err`。凍結してあるので後から書き換えられない
   */
  err<E>(error: E): Err<E> {
    return Object.freeze({ [OkTag]: false as const, error });
  },

  /**
   * 成功していれば値を変換する。
   *
   * @param result 変換元
   * @param fn 成功しているときだけ呼ぶ変換
   * @returns 成功なら `fn` の戻り値の `ok`。失敗なら同じ `err` をそのまま返す
   */
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result[OkTag] ? Result.ok(fn(result.value)) : result;
  },

  /**
   * 成功していれば、失敗しうる次の処理へ渡す。
   *
   * @param result 渡す元
   * @param fn 成功しているときだけ呼ぶ次の処理
   * @returns 成功なら `fn` の戻り値そのもの。失敗なら同じ `err` をそのまま返す
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> {
    return result[OkTag] ? fn(result.value) : result;
  },

  /**
   * 失敗していればエラーを変換する。
   *
   * @param result 変換元
   * @param fn 失敗しているときだけ呼ぶエラーの変換
   * @returns 失敗なら `fn` の戻り値を持つ `err`。成功なら同じ `ok` をそのまま返す
   */
  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return result[OkTag] ? result : Result.err(fn(result.error));
  },

  /**
   * 成功していればその値、失敗していれば代わりの値。
   *
   * @param result 先に見るほう
   * @param defaultValue `result` が失敗のときに返す値
   * @returns 成功ならその値。失敗ならエラーを捨てて `defaultValue`
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result[OkTag] ? result.value : defaultValue;
  },

  /**
   * 成功しているか。
   *
   * @param result 中身を見る `Result`
   * @returns 成功していれば `true`。失敗なら `false`
   */
  isOk<T, E>(result: Result<T, E>): result is Ok<T> {
    return result[OkTag];
  },

  /**
   * Ok の値を取り出す。Err の場合は例外を投げる。
   *
   * @param result 成功しているはずの結果
   * @returns `result` の値
   * @throws `result` が失敗のとき。メッセージにエラーを文字列にしたものを含める
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (!result[OkTag]) {
      throw new Error(`cannot unwrap an Err result: ${String(result.error)}`);
    }
    return result.value;
  },
} as const;
