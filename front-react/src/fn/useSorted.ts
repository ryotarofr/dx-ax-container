import { useMemo, useState } from "react";

import { partializeSetState } from "@/fn/partializeSetState";

export const useSorted = <T>({
  data,
  initSortOrderMap,
  ascSorterMap,
}: {
  data: T[];
  initSortOrderMap: Record<PropertyKey, Order>;
  ascSorterMap: Record<PropertyKey, (prev: any, next: any) => number>;
}) => {
  const [sortOrderMap, setSortOrderMap] = useState<SortOrderMap>(initSortOrderMap);

  const getSortedWithIndex = getSortedWithIndexFn(sortOrderMap, ascSorterMap);
  const sortedWithIndex = useMemo(
    () => getSortedWithIndex(data),
    [JSON.stringify(data), JSON.stringify(sortOrderMap)],
  );
  const sortedData = sortedWithIndex.map((it) => it.data);
  const sortedIndices = sortedWithIndex.map((it) => it.index);

  const getSetSortOrderFromKey = partializeSetState(setSortOrderMap);
  const setSortOrder
    = (key: keyof T): SetSortOrder =>
      (setter) =>
        typeof setter === "function"
          ? getSetSortOrderFromKey(key as string)(
            (prev) => setter({
              prev,
              getPrev: (current: Order) => getShiftedOrder(current, -1),
              getNext: (current: Order) => getShiftedOrder(current,  1),
            }),
          )
          : getSetSortOrderFromKey(key as string)(setter);

  return {
    data: sortedData,
    dataIndices: sortedIndices,
    orderMap: sortOrderMap as Record<keyof T, Order>,
    setOrderMap: setSortOrderMap,
    setOrder: setSortOrder,
    getSorted: <T>(data: T[]): T[] => getSortedWithIndex(data).map((it) => it.data),
  };
};

const orders = ["none", "asc", "desc"] as const;
type Order = typeof orders[number];
type SortOrderMap = Record<PropertyKey, Order>;
export type { Order as SortOrder };
export type SetSortOrder =
  (setter: Order
    | ((args: {
      prev: Order;
      getPrev: (order: Order) => Order;
      getNext: (order: Order) => Order;
    }) => Order),
  ) => void;

export const getShiftedOrder = (current: Order, shift: number): Order => {
  const nextIndexRaw = orders.indexOf(current) + shift;
  const nextIndex = nextIndexRaw % orders.length;
  return orders[nextIndex] as Order;
};

const getSortedWithIndexFn = (
  sortOrderMap: SortOrderMap,
  ascSorterMap: Record<PropertyKey, (prev: any, next: any) => number>,
) => <T>(
  data: T[],
): {data: T; index: number}[] => {
  const withIndex = [...data]
    .map((data, index) => ({
      data,
      index,
    }));
  return Object.entries(sortOrderMap)
    .reduce((dataWithIndex, [key, order]) => {
      if (order === "none") return dataWithIndex;
      return dataWithIndex.sort(({ data: prev }, { data: next }) => {
        const ascSorter = ascSorterMap[key];
        if (!ascSorter) return 0;
        const ascSortResult = ascSorter(prev[key], next[key]);
        return order === "asc"
          ? ascSortResult
          : ascSortResult * -1;
      });
    }, withIndex);
};
