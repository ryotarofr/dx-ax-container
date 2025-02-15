/**
 * ネストされたプロパティの型をキーの配列から取得する。
 *
 * @typeParam T - 対象のオブジェクト型
 * @typeParam Keys - キーの配列
 */
export type NestedValueOf<T, Keys, Unions extends unknown[] = []> =
  // T自体がnullableな場合の例外的な対応処理
  T extends NonNullable<T>
    ? NestedValueOfInner<T, Keys, Unions>
    : NestedValueOfInner<T, Keys, Unions> | undefined;

/** 本体 */
type NestedValueOfInner<T, Keys, Unions extends unknown[] = []> =
  Keys extends [infer Head, ...infer Tails]
    ? Head extends keyof NonNullable<T>
      ? Tails extends []
        ? NonNullable<T>[Head] | Unions[number]
        : NestedValueOf<
          Required<NonNullable<T>>[Head],
          Tails,
          [...Unions, Exclude<NonNullable<T>[Head], object>]
        >
      : T
    : T;
