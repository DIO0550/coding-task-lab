/**
 * オブジェクトが取りうる値の union。
 *
 * 値の集合を定数のオブジェクトで持ち、そこから型を導出するために使う
 * (集合と union を二重管理しない / rules/coding.md「値の語彙を型で閉じる」)。
 */
export type ValueOf<T> = T[keyof T];
