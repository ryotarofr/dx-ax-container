import clsx from "clsx";
import {
  CSSProperties,
  ComponentPropsWithRef,
  DependencyList,
  ReactNode,
  useEffect,
  useState,
  MouseEventHandler,
  useRef,
  SetStateAction,
} from "react";

import { getMappedObject } from "@/fn/getMappedObject";
import { isTargetingControllable } from "@/fn/isTargetingControllable";
import { partializeSetState } from "@/fn/partializeSetState";
import { makeMapped } from "@/fn/state/makeMapped";
import { useFocus } from "@/fn/state/useFocus";
import { useOptional } from "@/fn/state/useOptional";
import { Pagination, UsePagination, usePagination } from "@/fn/state/usePagination";
import { useSorted } from "@/fn/state/useSorted";
import { TabIndex, TabIndexes } from "@/fn/state/useTabIndexes";
import { Override } from "@/type/Override";
import { Setter } from "@/type/Setter";
import { StateArgs } from "@/type/State";

import { DataRow } from "./DataRow";
import { getColumnBundlesParRowHeader } from "./getColumnBundlesParRowHeader";
import {
  RenderMap,
  RenderOption,
  getColumnOptionMap,
  getDefaultAlign,
} from "./getColumnOptionMap";
import { HeaderBundles } from "./HeaderBundles";
import { Paginator } from "./Paginator";
import styles from "./Table.module.scss";

/**
 * データテーブル
 *
 * @typeParam T - 表示元データの型
 * @deprecated - テーブルの新規配置時には代替不可な場合を除き、
 * `useTable()`と`<TableView/>`を用いてください。
 */
export const Table = <
  T extends Record<PropertyKey, unknown>,
>({
  tabIndex,
  data = [],
  deps: initDeps = [JSON.stringify(data)],
  renderMap,
  pagination: propsPagination = defaultPagination,
  rowPropsMapper,
  setSelected: setSelectedData,
  setSelectedWithDataIndex,
  selectedDataIndices: propsSelectedDataIndices,
  selectMany = false,
  initSelect = !selectMany,
  moveFocusByKeyboard = selectMany,
  moveFocusFlg = true,
  selectCancelable = selectMany,
  selectChangeable = true,
  focusWithScrollToDataIndex,
  getSelectedParRow,
  setController,
  rowIndexes,
  onDoubleClickHandler,
  customSortOrder,
  customSortkeyList,
  ...wrappedProps
}: Override<
  /** root要素に渡す */
  ComponentPropsWithRef<"div">,
  {
    tabIndex?: TabIndex;
    /** 表示対象の情報 */
    data: T[] | undefined;
    /**
     * 描画初期化用の依存関係
     *
     * useEffectに渡され、ページ位置や選択状態等を初期化するフラグになる。
     * デフォルトは[props.data]。
     *
     * @example
     * - useEffectの第二引数に相当する値を渡す必要がある。
     * - 配列の形で、変数のリストを渡すこと。
     * - objectやarrayを渡す際は、JSON.stringifyで文字列化すること。(deep-equal の代替表現)
     * ```
     * <Table
     *   deps={[
     *     count, // number
     *     JSON.stringify(referenceObject), // object -> string
     *     JSON.stringify(searchedDataList), // array -> string
     *   ]}
     * ```
     */
    deps?: DependencyList;
    /**
     * テーブルの描画内容についての定義
     *
     * 文字列 または `ReactNode`（JSX）を与えた場合、値がヘッダーに描画される。
     *
     * オブジェクトを与えた場合は`LabelMap<T>`として認識される。
     * `LabelMap<T>`は概形としてRecord型であり、下記のような形で補完候補を閲覧できる。
     * ```
     * <Table
     *   renderMap={{
     *     _test: {
     *       // ここにカーソルを置いて [Ctrl]+[Space]
     *     }
     *   }}
     * />
     * ```
     *
     * また、`{ _selector: { ... } }` のように先頭に`_`をつけることで、元データに無い新しい列を描画できる。
     */
    renderMap: RenderMap<T>;
    /**
     * ページネーションの初期設定
     *
     * `false` を設定すると、無効化される
     *
     * @param offset - データの描画開始位置
     * @param limit - 1ページごとの描画行数
     */
    pagination?: Partial<InitPagination> | false;
    /**
     * 行のpropsを上書きする
     */
    rowPropsMapper?: (row: T, options: RenderOption) => ComponentPropsWithRef<"div">;
    /**
     * 行が選択される度実行される関数
     *
     * 関数が設定されていれば選択機能が有効になり、行単位での選択が可能になる。
     *
     * @example
     * ```
     * const data: T[] = [];
     * const [selected, setSelected] = useState<T[]>([]);
     *
     * <Table
     *  data={data}
     *  setSelected={setSelected}
     * />
     * ```
     */
    setSelected?: (data: T[]) => void;
    /**
     * 選択済み行の、`dataIndex`とデータのPair群の提供先関数
     *
     * @example
     * ```
     * const data: T[] = [];
     * const [selected, setSelected] = useState<Record<number, T>>({});
     *
     * <Table
     *  data={data}
     *  setSelectedWithDataIndex={setSelected}
     * />
     * ```
     */
    setSelectedWithDataIndex?: (selected: Record<number, T>) => void;
    /**
     * 外部から操作可能な行選択状態を設定できる。
     * @example
     * ```
     * const tableData: T[] = [];
     * const [selectedDataIndices, setSelectedDataIndices] = useState<number[]>([]);
     * const maxSelectIndex = tableData.length - 1;
     * const selectFirst = () => setSelectedDataIndices([0]);
     * const selectPrev = () => setSelectedDataIndices(([index]) => ([Math.max(index - 1, 0)]));
     * const selectNext = () => setSelectedDataIndices(([index]) => ([Math.min(index + 1, maxSelectIndex)]));
     * const selectLast = () => setSelectedDataIndices([maxSelectIndex]);
     *
     * return (
     *   <>
     *     <Button onClick={selectFirst}>{"|<"}</Button>
     *     <Button onClick={selectPrev}>{"<"}</Button>
     *     <Button onClick={selectNext}>{">"}</Button>
     *     <Button onClick={selectLast}>{">|"}</Button>
     *     <Table
     *       data={tableData}
     *       selectedDataIndices={{
     *         get: selectedDataIndices,
     *         set: setSelectedDataIndices,
     *       }}
     *     />
     *   </>
     * )
     * ```
     */
    selectedDataIndices?: StateArgs<number[]>;
    /**
     * trueなら複数選択を許可する
     * デフォルトは`false`。
     */
    selectMany?: boolean;
    /**
     * selectMany === true 時、初期表示時に1行目を選択状態にする。
     * デフォルトは`true`;
     */
    initSelect?: boolean;
    /**
     * trueならキーボード[↑/↓]でフォーカスが移動する。
     * falseなら「選択状態」が移動する。
     * デフォルトは`== selectMany`。
     */
    moveFocusByKeyboard?: boolean;
    /**
     * falseならmoveFocusByKeyboardでの動きを停止する。
     */
    moveFocusFlg?: boolean;
    /**
     * trueなら選択解除を許可する
     *
     * デフォルトは selectMany と同期。
     */
    selectCancelable?: boolean;
    /**
     * trueなら選択変更可能、falseなら選択変更不可
     */
    selectChangeable?: boolean;
    /**
     * 与えられたdataIndexに反応してフォーカスとスクロールを行う
     */
    focusWithScrollToDataIndex?: number;
    /**
     * 選択状態を行ごとに外部から注入する
     */
    getSelectedParRow?: (datum: T, dataIndex: number) => boolean;
    /**
     * テーブルの状態を操作するための関数群を取得できる
     *
     * @example
     * ```
     * const [tableController, setTableController] = useState<TableController>();
     * return (
     *   <>
     *     <Table
     *       setController={setTableController}
     *     />
     *     <Button
     *       onClick={() => {
     *         controller?.focus?.set(12);        // 13行目をフォーカス
     *         controller?.select?.set(12)(true); // 13行目を選択
     *       }}
     *     >13行目を選択</Button>
     *   </>
     * );
     * ```
     */
    setController?: Setter<TableController | undefined>;
    /**
     * 選択状態のインデックスを行ごとに外部から注入する
     */
    rowIndexes?: number[];
    onDoubleClickHandler?: MouseEventHandler;
    /**
     * 事前に準備したカスタムソート順序
     */
    customSortOrder?: Record<string, string[]>;
    /**
     * カスタムソート対象ヘッダーリスト
     */
    customSortkeyList?: string[];
  }
>): ReactNode => {
  const tabIndexes = TabIndexes.from(tabIndex);
  const columnOptionMap = getColumnOptionMap({ renderMap });
  const dataWithIndex = data.map((it, index) => ({
    get: it,
    index,
  }));
  const dataIndexes = dataWithIndex.map((it) => it.index);
  const focusable = !!setSelectedWithDataIndex
    || !!setSelectedData
    || !!propsSelectedDataIndices;

  // 選択されたデータのindexを保持
  const getInitSelectedDataIndices = (): number[] => {
    return data
      .map((datum, index) => ([datum, index] as const))
      .filter(([datum, index]) => {
        if (index === 0 && initSelect) return true;
        return getSelectedParRow?.(datum, index) ?? false;
      }).map(([, index]) => index);
  };
  const getSelectedMapFromDataIndices = (indices: number[]): Record<number, boolean> => {
    return Object.fromEntries(data.map((datum, index) => {
      const selected = indices.includes(index) ?? false;
      return [index, selected];
    }));
  };
  const getSelectedDataIndicesFromSelectedMap = (selectedMap: Record<number, boolean>) => {
    return Object.entries(selectedMap)
      .filter(([, value]) => value)
      .map(([key]) => Number(key));
  };
  const [selectedMap, _setSelectedMap] = makeMapped(
    useOptional(propsSelectedDataIndices, getInitSelectedDataIndices()), {
      to: getSelectedMapFromDataIndices,
      from: getSelectedDataIndicesFromSelectedMap,
    },
  );
  // 選択状態を初期化する関数
  const initializeSelectedMap = () => {
    if (propsSelectedDataIndices) return;
    const indices = getInitSelectedDataIndices();
    const selectedMap = getSelectedMapFromDataIndices(indices);
    _setSelectedMap(selectedMap);
  };
  const setSelectedMap = (key: number): Setter<boolean> =>
    Setter.from<boolean>((getNext) => {
      return selectMany
        ? partializeSetState(_setSelectedMap)(key)(getNext)
        : _setSelectedMap((prev) => {
          const next = getNext(prev?.[key] ?? false);
          return Object.fromEntries([[key, next]]);
        });
    });
  const selectable = focusable;
  // props から渡された各種Setterに値を反映する
  useEffect(() => {
    if (!selectable) return;
    const indices = Object.entries(selectedMap)
      .filter(([, value]) => value)
      .map(([key]) => Number(key));
    const selected = Object.fromEntries(
      indices
        .map((index) => [index, data[index] as T])
        .filter(([, it]) => it !== undefined),
    ) as Record<number, T>;
    setSelectedWithDataIndex?.(selected);
    setSelectedData?.(Object.values(selected));
  }, [JSON.stringify(selectedMap), selectMany, selectable]);

  // 行リサイズ値保持用Hook
  const [columnWidthes, _setColumnWidthes] = useState<Record<PropertyKey, string | undefined>>({});
  useEffect(() => {
    _setColumnWidthes(Object.fromEntries(Object.entries(columnOptionMap)
      .filter(([, options]) => !options.isHidden)
      .map(([key, options]) => ([key, options.initColumnWidth])),
    ));
  }, [JSON.stringify(
    // renderMapの内、行幅に関連するプロパティのみ監視
    Object.entries(columnOptionMap)
      .map(([key, options]) =>
        ([key, [options.isHidden, options.initColumnWidth]]),
      ),
  )]);
  const setColumnWidthes = partializeSetState(_setColumnWidthes);

  const initSortOrderMap = getMappedObject(columnOptionMap, ([, { initSortOrder }]) => initSortOrder);
  const buildAscSorterMap = (columnOptionMap, customSortkeyList, customArr) => {
    let ascSorterMap = {};

    Object.entries(columnOptionMap).forEach(([key, columnOptions]) => {
      if (customSortkeyList.includes(key) && (columnOptions as any).customSort) {
        const targetCustomArr = customArr[key];
        ascSorterMap[key] = (prev, next) => (columnOptions as { customSort: (arr: any[], a: any, b: any) => number }).customSort(targetCustomArr, prev, next);
      }
    });

    return ascSorterMap;
  };

  const [selectHeaderLabel, setSelectHeaderLabel] = useState<string | undefined>();

  let ascSorterMap = null;
  if (Object.keys(columnOptionMap).length > 0) {
    for (const [key, value] of Object.entries(columnOptionMap)) {
      if (
        value.label === selectHeaderLabel
        && Array.isArray(customSortkeyList)
        && customSortkeyList.includes(value.key)) {
        ascSorterMap = buildAscSorterMap(columnOptionMap, customSortkeyList, customSortOrder);
        break;
      }
    }
    if (ascSorterMap === null) {
      ascSorterMap = getMappedObject(columnOptionMap, ([, { ascSorter }]) => ascSorter);
    }
  }
  const sorted = useSorted({
    data,
    initSortOrderMap,
    ascSorterMap: ascSorterMap,
  });
  const initializeSortOrderMap = () => sorted.setOrderMap(initSortOrderMap);
  const getDataIndexFromRenderIndex = (renderIndex: RenderIndex | undefined): DataIndex | undefined =>
    sorted.dataIndices[renderIndex ?? -1];
  const getRenderIndexFromDataIndex = (dataIndex: DataIndex | undefined): RenderIndex | undefined => {
    const index = sorted.dataIndices.indexOf(dataIndex ?? -1);
    return index === -1 ? undefined : index;
  };
  const setSelectedMapWithRenderIndex = (renderIndex: RenderIndex) => {
    const dataIndex = getDataIndexFromRenderIndex(renderIndex);
    return setSelectedMap(dataIndex!);
  };

  // 列選択用
  const focus = useFocus(sorted.dataIndices.map((it) => ({ id: it.toString() })));

  // ページネーション用Hook群
  const autoLimitRef = useRef<HTMLDivElement>(null);
  const [autoLimit, setAutoLimit] = useState<number>();
  useEffect(() => {
    const target = autoLimitRef.current;
    if (!target) return;
    const tableHeight = target.parentElement?.clientHeight;
    if (!tableHeight) return;
    const headerHeight = target.clientHeight;
    const autoPaginationLimit = -1 + Math.floor(tableHeight / headerHeight);
    if (isNaN(autoPaginationLimit)) return;
    if (!isFinite(autoPaginationLimit)) return;
    if (autoPaginationLimit === 0) return;
    setAutoLimit(autoPaginationLimit);
  }, initDeps);
  const initPagination = {
    ...defaultPagination,
    ...propsPagination,
  };
  const dataLength = data.length;
  const page = usePagination({
    init: initPagination,
    dataLength,
    disabled: propsPagination === false,
    observe:
      initPagination.autoLimit
        && autoLimit != null
        ? { limit: autoLimit }
        : undefined,
    setFocusedRenderIndex: focus.setByIndex,
  });
  // ページ位置を初期化する関数
  const initializePageOffset = () => page.setOffset(0);
  const paginatedData = page.getPaginated(sorted.data);
  const paginatedDataIndices = page.getPaginated(sorted.dataIndices);
  useEffect(() => {
    if (!rowIndexes) return;
    rowIndexes.forEach((index) => {
      const selected = selectedMap[index] ?? false;
      setSelectedMap(index)(!selected);
    });
  }, [rowIndexes]);

  useEffect(() => {
    const renderIndex = getRenderIndexFromDataIndex(focusWithScrollToDataIndex);
    focus.setByIndex(renderIndex);
  }, [focusWithScrollToDataIndex]);

  // 各カラムの合計値を計算
  const columnSums = Object.keys(renderMap).reduce((sums, key) => {
    if (renderMap[key].total) {
      sums[key] = paginatedData.reduce((total, datum) => {
        const value = datum[key];
        if (typeof value === "number") {
          total += value;
        }
        return total;
      }, 0);
    }
    return sums;
  }, {});

  // 合計行を表示するかどうかを判断
  const showTotalRow = Object.keys(renderMap).some((key) => renderMap[key].total);

  // 合計値を表示する行を作成
  const totalRow = showTotalRow && (
    <div
      className={styles.DataRow}
    >
      {Object.entries(columnOptionMap)
        .map(([, {
          key,
          label,
          isHidden,
          valueMapper,
        }]) => {
          if (isHidden) return <></>;
          const value = key === "_index" ? "合計" : valueMapper(columnSums[key], {
            renderIndex: -1,
            dataIndex: -1,
            localIndex: -1,
            isFocused: false,
            isSelected: false,
          });
          const style = {
            "--text-align": "right",
          } as CSSProperties;
          return (
            <div
              key={key.toString()}
              className={clsx(
                styles.Cell,
              )}
              data-label={label}
              style={style}
            >{value}</div>
          );
        })
      }
    </div>
  );

  // 列固定ヘッダ毎に列数をカウントしたものを取得
  const columnBundleCounts = getColumnBundlesParRowHeader({
    columnOptions: Object.values(columnOptionMap),
  }).map((it) => ([it.headers.length, it.contents.length] as const));

  // データが変更された際は状態を初期化する
  useEffect(() => {
    initializeSelectedMap();
    initializeSortOrderMap();
    initializePageOffset();
    const renderIndex = getRenderIndexFromDataIndex(focusWithScrollToDataIndex);
    focus.setById(renderIndex?.toString());
  }, initDeps);

  const focusAndSelect: TableController["focusAndSelect"] = (value, options) => {
    focus.setByIndex((prev) => {
      const nextRaw = Setter.toValue(value, prev);
      const next = nextRaw == null
        ? undefined
        : Math.max(0, Math.min(nextRaw, dataLength - 1));
      const nextDataIndex = getDataIndexFromRenderIndex(next);
      nextDataIndex != null
        && setSelectedMap(nextDataIndex)(true);
      if (prev === next) options?.unchangedCallback?.();
      return next;
    });
  };
  const controller: TableController = {
    page: {
      ...page,
      dataIndices: paginatedDataIndices,
      getCurrent: <T, >(tableData: T[]) => paginatedDataIndices
        .map((index) => tableData?.[index])
        .filter((it): it is T => it != null),
    },
    select: {
      get: selectedMap,
      set: setSelectedMap,
      setAll: _setSelectedMap,
      isSelectableDataIndex: (dataIndex: number) =>
        !(dataIndex < 0 || dataLength <= dataIndex),
    },
    focus: {
      get: focus.index,
      set: focus.setByIndex,
      isFocusableDataIndex: (dataIndex: number) =>
        !(dataIndex < 0 || dataLength <= dataIndex),
      getDataIndexFromRenderIndex,
    },
    focusAndSelect,
    focusAndSelectPrev: (options) => focusAndSelect((prev) => (prev ?? dataLength) - 1, options),
    focusAndSelectNext: (options) => focusAndSelect((prev) => (prev ?? -1) + 1, options),
  };
  useEffect(() => setController?.(controller), [JSON.stringify(controller)]);

  /** 操作を受けて変動する[選択状態/フォーカス状態]何れかのRenderIndexStateSetter。 */
  const setCurrentRenderIndex = moveFocusByKeyboard
    ? focus.setByIndex
    : focusAndSelect;

  return (
    <div
      {...wrappedProps}
      className={clsx(styles.Table,
        wrappedProps.className,
      )}
      style={{
        "--template-columns": Object.values(columnWidthes ?? {}).join(" "),
        ...wrappedProps.style,
      } as CSSProperties}
      onDoubleClick={onDoubleClickHandler}
      tabIndex={tabIndexes.latest ?? 0}
      onKeyDown={(event) => {
        wrappedProps.onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.isPropagationStopped()) return;
        if (isTargetingControllable(event)) return;
        const inPageMax = page.nextOffset - 1;
        if (event.key === "ArrowUp") {
          if (moveFocusFlg) {
            event.preventDefault();
            const getInPagePrev = (prev?: number) => Math.max(page.offset, (prev ?? inPageMax) - 1);
            setCurrentRenderIndex(getInPagePrev);
          }
        }
        if (event.key === "ArrowDown") {
          if (moveFocusFlg) {
            event.preventDefault();
            const getInPageNext = (prev?: number) => Math.min(inPageMax, (prev ?? -1) + 1);
            setCurrentRenderIndex(getInPageNext);
          }
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          page.set((prev) => prev - 1, { setRenderIndex: setCurrentRenderIndex });
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          page.set((prev) => prev + 1, { setRenderIndex: setCurrentRenderIndex });
        }
        if (event.key === " ") {
          event.preventDefault();
          if (focus.id == null) return;
          if (!selectChangeable) return;
          setSelectedMap(Number(focus.id))((prev) => {
            if (prev && !selectCancelable) return true;
            return !prev;
          });
        }
      }}
    >
      <div
        ref={focus.setScrollRef}
        className={clsx(
          styles.Grid,
          "grid",
        )}
      >
        {paginatedData
          .map((datum, localIndex) => {
            const dataIndex = paginatedDataIndices[localIndex]!;
            const selected = selectedMap[dataIndex] ?? false;
            const renderOptions = {
              renderIndex: page.offset + localIndex,
              dataIndex,
              localIndex,
              isFocused: focus.id === dataIndex.toString(),
              isSelected: selected,
            };
            const props = rowPropsMapper?.(datum, renderOptions);
            const focused = focusable && focus.id === dataIndex.toString();
            return (
              <DataRow
                ref={focus.setContentRefs(dataIndex.toString())}
                {...props}
                key={dataIndex}
                className={clsx(
                  styles.DataRow,
                  clsx(styles.Row, "row"),
                  focused && clsx(styles.Focused, "focused"),
                  selected && clsx(styles.Selected, "selected"),
                  props?.className,
                )}
                bundleCounts={columnBundleCounts}
                allBundleClassName={clsx(
                  clsx(styles.Bundle, "bundle"),
                )}
                rowHeaderBundleClassName={clsx(
                  styles.HeaderColumnBundle,
                  clsx(styles.Bundle, "bundle"),
                )}
                selectMany={selectMany}
                selectable={selectable}
                selectCancelable={selectCancelable}
                selectChangeable={selectChangeable}
                renderIndex={getRenderIndexFromDataIndex(dataIndex)!}
                focusedRenderIndex={focus.index}
                setFocusedRenderIndex={focus.setByIndex}
                selected={selectedMap[dataIndex]}
                setSelectedMapWithRenderIndex={setSelectedMapWithRenderIndex}
              >
                {Object.entries(columnOptionMap)
                  .map(([key, options]) => {
                    const {
                      label,
                      isHidden,
                      isRowHeader,
                      valueMapper,
                      align: rawAlign,
                    } = options;
                    const rawValue = datum[key];
                    const value = valueMapper(rawValue as T, renderOptions);
                    const align = rawAlign ?? getDefaultAlign(rawValue ?? value);
                    const style = {
                      "--text-align": align,
                    } as CSSProperties;
                    return (
                      <div
                        key={key}
                        className={clsx(
                          isRowHeader && clsx(
                            styles.HeaderColumnCell,
                            clsx(styles.Header, "header"),
                          ),
                          !isRowHeader && styles.DataCell,
                          clsx(styles.Cell, "cell"),
                          isHidden && styles.Hidden,
                        )}
                        data-label={label}
                        style={style}
                      >{value}</div>
                    );
                  })
                }
              </DataRow>
            );
          })
        }
        {/* 合計値の行 */}
        {totalRow}
        <HeaderBundles
          bundleCounts={columnBundleCounts}
          rowHeaderBundleClassName={clsx(
            styles.HeaderColumnBundle,
            styles.HeaderColumnBundleInHeaderRow,
            clsx(styles.Bundle, "bundle"),
          )}
          columnOptionMap={columnOptionMap}
          sorted={sorted}
          setColumnWidthes={setColumnWidthes}
          setSelectHeaderLabel={setSelectHeaderLabel}
        />
      </div>
      <Paginator
        page={page}
        setCurrentRenderIndex={setCurrentRenderIndex}
        dataLength={dataLength}
      />
    </div>
  );
};

type InitPagination = Pagination & {
  autoLimit?: boolean;
};
const defaultPagination: InitPagination = {
  limit: 10,
  offset: 0,
  autoLimit: false,
};

export type TableController = {
  page: UsePagination & {
    /** 現在のページで表示中の dataIndex のリスト */
    dataIndices: number[];
    /** 現在のページで表示中の dataIndex を基に tableData から要素を抽出 */
    getCurrent: <T>(tableData: T[]) => T[];
  };
  select: {
    /** 選択状態を取得 */
    get: Record<DataIndex, boolean>;
    /** 選択状態を設定 */
    set: (dataIndex: DataIndex) => Setter<boolean>;
    /** 全ての選択状態を設定 */
    setAll: Setter<Record<DataIndex, boolean>>;
    /** 選択可能なデータインデックスであればtrueを返す */
    isSelectableDataIndex: (dataIndex: DataIndex) => boolean;
  };
  focus: {
    /** フォーカス状態（renderIndex）を取得 */
    get: RenderIndex | undefined;
    /** フォーカス状態（renderIndex）を設定 */
    set: Setter<RenderIndex | undefined>;
    /** フォーカス可能なデータインデックスであればtrueを返す */
    isFocusableDataIndex: (dataIndex: DataIndex) => boolean;
    /** renderIndex から dataIndex を取得 */
    getDataIndexFromRenderIndex: (renderIndex: RenderIndex | undefined) => DataIndex | undefined;
  };
  focusAndSelect: (value: SetStateAction<RenderIndex | undefined>, options?: FocusAndSelectOptions) => void;
  focusAndSelectPrev: (options?: FocusAndSelectOptions) => void;
  focusAndSelectNext: (options?: FocusAndSelectOptions) => void;
};
type FocusAndSelectOptions = {
  unchangedCallback?: () => void;
};

type DataIndex = number;
type RenderIndex = number;
