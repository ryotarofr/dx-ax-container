import clsx from "clsx";
import {
  ComponentPropsWithoutRef,
  Dispatch,
  ForwardedRef,
  forwardRef,
  PointerEventHandler,
  ReactNode,
  SetStateAction,
} from "react";

import { isTargetingControllable } from "@/fn/isTargetingControllable";
import { range } from "@/fn/range";
import { Override } from "@/type/Override";

import { ColumnBundles } from "../ColumnBundles";
import styles from "./DataRow.module.scss";

export type FocusFn = (direction: "forward" | "backward" | "here") => void;

/**
 * Table のデータ行
 */
export const DataRow = forwardRef(function DataRow({
  selectMany,
  selectable,
  selectCancelable,
  selectChangeable,
  renderIndex,
  focusedRenderIndex,
  setFocusedRenderIndex,
  selected,
  setSelectedMapWithRenderIndex,
  children,
  ...wrappedProps
}: Override<
  /** `<div />`要素に渡す */
  ComponentPropsWithoutRef<typeof ColumnBundles>,
  {
    selectMany: boolean;
    selectable: boolean;
    selectCancelable: boolean;
    selectChangeable: boolean;
    renderIndex: number;
    focusedRenderIndex: number | undefined;
    setFocusedRenderIndex: (index: number) => void;
    selected: boolean | undefined;
    setSelectedMapWithRenderIndex: (key: number) => Dispatch<SetStateAction<boolean>>;
    /** 子要素 */
    children?: ReactNode;
  }
>, _ref: ForwardedRef<HTMLDivElement>): ReactNode {

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!selectable) return;
    if (event.button !== 0 /* primary */) return;
    if (isTargetingControllable(event)) return;
    const prevFocused = focusedRenderIndex;
    const nextFocused = renderIndex;
    const nextSelected = selected;
    const targetIndices = selectMany && event.shiftKey
      ? range(nextFocused, {
        from: prevFocused,
        backwardExpansion: 1,
      })
      : [renderIndex];
    if (selectChangeable) {
      targetIndices.forEach((it) => setSelectedMapWithRenderIndex(it)(() => {
        if (nextSelected && !selectCancelable) return true;
        return !nextSelected;
      }));
    }
    if (!event.shiftKey) {
      setFocusedRenderIndex(nextFocused);
    }
    wrappedProps.onPointerDown?.(event);
  };

  return (
    <ColumnBundles
      ref={_ref}
      {...wrappedProps}
      className={clsx(
        styles.DataRow,
        wrappedProps.className,
      )}
      onPointerDown={onPointerDown}
    >
      {children}
    </ColumnBundles>
  );
});
