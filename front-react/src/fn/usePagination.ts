import { SetStateAction, useEffect, useRef, useState } from "react";

import { partializeSetStateDeep } from "@/fn/partializeSetState";
import { Setter } from "@/type/Setter";

import { range } from "../range";

type Offset = number;
export type Pagination = {
  offset: Offset;
  limit: number;
};

export const usePagination = ({
  init,
  dataLength,
  disabled = false,
  observe,
}: {
  init: Pagination;
  dataLength: number;
  disabled?: boolean;
  observe?: Partial<Pagination>;
  setFocusedRenderIndex?: Setter<number | undefined>;
}) => {
  const [pagination, setPagination] = useState<Pagination>(init);
  useEffect(() => {
    if (!observe) return;
    setPagination((prev) => ({
      ...prev,
      ...observe,
    }));
  }, [JSON.stringify(observe)]);
  const _setOffset = partializeSetStateDeep(setPagination)("offset");
  const setLimit = partializeSetStateDeep(setPagination)("limit");

  const offset = disabled ? 0 : pagination.offset;
  const limit = Math.max(1, disabled ? dataLength : pagination.limit);
  const nextOffset = offset + limit;
  const currentPage = Math.ceil(nextOffset / limit);
  const min = 1;
  const max = Math.ceil(dataLength / limit);

  const indices = range(offset + limit, { from: offset });
  const getPaginated = <T, >(data: T[]) => {
    if (disabled) return data;
    const paginated = data.slice(offset, offset + limit);
    return paginated;
  };
  const getMinOffset = () => 0;
  const getMaxOffset = () => (max - 1) * limit;
  const setOffset = (
    setter: Offset
      | ((args: {
        prev: Offset;
        getPrev: (prev: Offset) => Offset;
        getNext: (prev: Offset) => Offset;
        getMin: () => Offset;
        getMax: () => Offset;
      }) => Offset),
  ) => {
    return typeof setter === "function"
      ? _setOffset(
        (prev) => setter({
          prev,
          getPrev: (prev: Offset) => Math.max(getMinOffset(), prev - limit),
          getNext: (prev: Offset) => Math.min(prev + limit, getMaxOffset()),
          getMin: getMinOffset,
          getMax: getMaxOffset,
        }),
      )
      : _setOffset(setter);
  };

  const setPage = (getStateAction: SetStateAction<number>, options?: {
    setRenderIndex?: Setter<number | undefined>;
  }) => {
    const nextPageRaw = Setter.toValue(getStateAction, currentPage);
    const nextPage = Math.max(min, Math.min(nextPageRaw, max));
    const nextPageOffset = (nextPage - 1) * limit;
    options?.setRenderIndex?.((prev) => {
      if (prev == null) return prev;
      const pageLocalFocusedIndex = prev % limit;
      const nextOffsetRaw = nextPageOffset + pageLocalFocusedIndex;
      const nextOffset = Math.min(nextOffsetRaw, dataLength - 1);
      return nextOffset;
    });
    setOffset(nextPageOffset);
  };

  const limitRef = useRef<HTMLElement | null>(null);
  const setLimitWithRef = (target?: HTMLElement | null) => {
    if (!target) return;
    if (limitRef.current) return;
    limitRef.current = target;
    const tableHeight = target.parentElement?.clientHeight;
    if (!tableHeight) return;
    const headerHeight = target.clientHeight;
    const autoPaginationLimit = -1 + Math.floor(tableHeight / headerHeight);
    if (isNaN(autoPaginationLimit)) return;
    if (!isFinite(autoPaginationLimit)) return;
    if (autoPaginationLimit === 0) return;
    setLimit(autoPaginationLimit);
  };

  return {
    disabled,
    offset,
    limit,
    indices,
    getPaginated,
    nextOffset,
    current: currentPage,
    min,
    max,
    set: setPage,
    setRaw: setPagination,
    setLimit,
    setLimitWithRef,
    setOffset,
    getOffsetOfPageByRenderIndex: (renderIndex: number) => {
      const page = Math.floor(renderIndex / limit);
      const nextOffsetRaw = page * limit;
      return Math.max(getMinOffset(), Math.min(nextOffsetRaw, getMaxOffset()));
    },
    getRenderIndexSetterFrom: (page: number) => (prevOffset: number = offset) => {
      const pageStartOffset = (page - 1) * limit;
      if (prevOffset == null) return pageStartOffset;
      const pageLocalFocusedIndex = prevOffset % limit;
      const nextFocusRaw = pageStartOffset + pageLocalFocusedIndex;
      const nextFocus = Math.min(nextFocusRaw, dataLength - 1);
      return nextFocus;
    },
  };
};

export type UsePagination = ReturnType<typeof usePagination>;
