import { ReactNode } from "react";

import { getMappedObject } from "@/fn/getMappedObject";
import { SortOrder } from "@/fn/state/useSorted";
import { RequiredFields } from "@/type/RequiredFields";

/**
 * RenderMap → ColumnOption
 * 引数用のデータ形式から内部ロジック用のデータ形式に変換する
 */
export const getColumnOptionMap = <T>(p: {
  renderMap: RenderMap<T>;
}): Record<keyof T | `_${string}`, ColumnOption<T>> => {
  return getMappedObject(
    p.renderMap,
    ([key, value]) => getColumnOption([key, value]),
  ) as Record<keyof T | `_${string}`, ColumnOption<T>>;
};

export const getDefaultAlign = (rawValue: unknown): ColumnOption<unknown>["align"] => {
  const toString = Object.prototype.toString;
  const objectStr = toString.call(rawValue);
  switch (objectStr) {
  case "[object Number]":
  case "[object Date]":
    return "right";
  default:
    return "left";
  }
};

const getColumnOption = <T>([
  _key,
  renderMapValue,
]: [
  PropertyKey,
  RenderMap<T>[keyof RenderMap<T>]
]): ColumnOption<T> => {
  const key = _key.toString();
  return {
    ...defaultColumnOption(key),
    ...(isColumnOptionArgsObject(renderMapValue)
      ? renderMapValue
      : { label: renderMapValue }) as ColumnOptionArgs<T>,
  };
};

export const defaultColumnOption = (key: string): ColumnOption<unknown> => ({
  key,
  label: "",
  valueMapper: (value) => `${value ?? ""}`,
  isRowHeader: false,
  ascSorter: (prev, next) => {
    if (prev == null) return 1;
    if (next == null) return -1;
    if (typeof prev === "number" && typeof next === "number")
      return prev - next;
    return `${prev ?? ""}`.localeCompare(`${next ?? ""}`, "ja");
  },
  customSort: ((customArr, prev, next) => {
    if (prev == null) return 1;
    if (next == null) return -1;
    const customArrMap = new Map(customArr.map((value, index) => [value, index]));

    const prevIndex = customArrMap.has(prev) ? customArrMap.get(prev) : -1;
    const nextIndex = customArrMap.has(next) ? customArrMap.get(next) : -1;

    return prevIndex - nextIndex;
  }),
  initSortOrder: "none",
  sortOrderIsChangeable: !key.toString().startsWith("_"),
  isHidden: false,
  initColumnWidth: "minmax(max-content, 1fr)",
});

const isColumnOptionArgsObject = <Value, >(obj: unknown): obj is ColumnOptionArgs<Value> => {
  return typeof obj === "object" && "label" in (obj ?? {});
};

export type RenderMap<T> = (
  [T] extends [never]
    ? unknown
    : { [Key in keyof T]?: ReactNode | ColumnOptionArgs<T[Key]> }
) & Record<`_${string}`, RequiredFields<ColumnOptionArgs<unknown>, "valueMapper">>;

export type ColumnOptionArgs<Value> = {
  /** ヘッダーへの描画内容 */
  label: ReactNode;
  /** 各セルへの描画内容 */
  valueMapper?: (
    rawValue: Value,
    options: RenderOption
  ) => ReactNode;
  /**
   * true ならセルをヘッダーとして描画する。
   * デフォルトは`false`。
   *
   * 連続して true に設定された列はグループ化された行ヘッダーになる。
   */
  isRowHeader?: boolean;
  /** ソート時に用いる比較関数。昇順。戻り値がマイナスならソートされず、プラスならソートされる。 */
  ascSorter?: (prev: Value, next: Value) => number;
  /**
   * 初期描画時のソート順序。
   *
   * デフォルトは`"none"`(ソートなし)。
   */
  initSortOrder?: SortOrder;
  /**
   * カスタム順でソート。
   */
  customSort?: (customArr:Value[], prev: Value, next: Value) => number;
  /**
   * trueならソート順序を切り替え可能。
   *
   * デフォルトは`true`。
   */
  sortOrderIsChangeable?: boolean;
  /**
   * trueなら列を描画しない。
   *
   * デフォルトは`false`。
   */
  isHidden?: boolean;
  /**
   * 行の幅の初期値。親の css[grid-template-columns] に初期設定される。
   * 例えば、`"max-content"`を設定すれば最大コンテンツ幅に縮小される。
   *
   * デフォルトは`"minmax(max-content, 1fr)"`。
   */
  initColumnWidth?: string;
  /**
   * 左右中央寄せ設定。
   *
   * デフォルトは`"left"`だが、特定の型[数値, 日付] については`"right"`になる。
   */
  align?: "center" | "left" | "right";
  /**
   * trueなら合計値を描画。
   *
   * デフォルトは`false`。
   */
  total?: boolean;
};

export type RenderOption = {
  renderIndex: number;
  dataIndex: number;
  localIndex: number;
  isFocused: boolean;
  isSelected: boolean;
};

export type ColumnOption<T> =
  ColumnOptionArgs<T>
  & Required<Pick<ColumnOptionArgs<T>, ColumnOptionRequiredkeys>>
  & { key: string };

type ColumnOptionRequiredkeys =
  "valueMapper"
  | "initSortOrder"
  | "ascSorter"
  | "sortOrderIsChangeable"
  | "isRowHeader"
  | "customSort";
