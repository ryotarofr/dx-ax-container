import clsx from "clsx";
import {
  CSSProperties,
  ComponentPropsWithRef,
  ForwardedRef,
  ReactNode,
  forwardRef,
} from "react";

import { Override } from "@/type/Override";

import styles from "./ColumnBundle.module.scss";

/**
 * Gridカラムを纏めるsubgrid親要素
 */
export const ColumnBundle = forwardRef(function ColumnBundle({
  columnStart = 0,
  columnCount,
  children,
  ...wrappedProps
}: Override<
  /** `<div />`要素に渡す */
  ComponentPropsWithRef<"div">,
  {
    /** 行開始位置 */
    columnStart?: number;
    /** 内部行総数 */
    columnCount: number;
    /** 子要素 */
    children?: ReactNode;
  }
>, ref: ForwardedRef<HTMLDivElement>): ReactNode {
  const cssVariables = {
    "--column-start": columnStart + 1,
    "--column-count": columnCount,
  } as CSSProperties;

  return (
    <div
      {...wrappedProps}
      ref={ref}
      className={clsx(
        styles.ColumnBundle,
        wrappedProps.className,
      )}
      style={{
        ...cssVariables,
        ...wrappedProps.style,
      }}
    >{children}</div>
  );
});
