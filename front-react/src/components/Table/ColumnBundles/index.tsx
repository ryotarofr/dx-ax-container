import clsx from "clsx";
import {
  Children,
  ComponentPropsWithoutRef,
  ForwardedRef,
  Fragment,
  ReactNode,
  forwardRef,
} from "react";

import { ColumnBundle } from "@/components/ui/Table/ColumnBundle";
import { range } from "@/fn/range";
import { Override } from "@/type/Override";

import styles from "./ColumnBundles.module.scss";

/**
 * [ヘッダー行数, コンテンツ行数] の数値指定を基に grid-column を纏める。
 */
export const ColumnBundles = forwardRef(function ColumnBundles({
  bundleCounts,
  allBundleClassName,
  rowHeaderBundleClassName,
  children,
  ...wrappedProps
}: Override<
  /** `<div />`要素に渡す */
  Omit<ComponentPropsWithoutRef<typeof ColumnBundle>, "columnCount">,
  {
    /** [ヘッダー行数, コンテンツ行数] の配列 */
    bundleCounts: (readonly [number, number])[];
    /** 全てのバンドルに渡すcssClassName */
    allBundleClassName?: string;
    /** 列ヘッダーバンドルに渡すcssClassName */
    rowHeaderBundleClassName?: string;
    /** 子要素 */
    children?: ReactNode;
  }
>, ref: ForwardedRef<HTMLDivElement>): ReactNode {
  const childrens = Children.toArray(children);
  const columnCountSum = bundleCounts.flat().reduce((sum, it) => sum + it);
  const bundleCountsWithUntilCount = bundleCounts
    .reduce((result, [headerLength, contentLength]) => {
      const tail = result[result.length - 1];
      const untilCount
        = (tail?.untilCount ?? 0)
        + (tail?.headerLength ?? 0)
        + (tail?.contentLength ?? 0);
      result.push({
        headerLength,
        contentLength,
        untilCount,
      });
      return result;
    }, [] as {
      headerLength: number;
      contentLength: number;
      untilCount: number;
    }[]);

  return (
    <ColumnBundle
      columnCount={columnCountSum}
      ref={ref}
      {...wrappedProps}
      className={clsx(
        styles.ColumnBundles,
        wrappedProps.className,
      )}
    >
      {bundleCountsWithUntilCount.map(({ headerLength, contentLength, untilCount }, index) => (
        <Fragment key={index}>
          <ColumnBundle
            columnStart={untilCount + headerLength}
            columnCount={contentLength}
            className={allBundleClassName}
          >
            {range(contentLength).map((index) => childrens[untilCount + headerLength + index])}
          </ColumnBundle>
          {headerLength === 0
            ? <Fragment />
            : <ColumnBundle
              columnStart={untilCount}
              columnCount={headerLength}
              className={clsx(
                styles.RowHeader,
                allBundleClassName,
                rowHeaderBundleClassName,
              )}
            >
              {range(headerLength).map((index) => childrens[untilCount + index])}
            </ColumnBundle>
          }
        </Fragment>
      ))}
    </ColumnBundle>
  );
});

export const getColumnBundleCounts = () => {

};
