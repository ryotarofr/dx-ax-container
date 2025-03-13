import { ColumnOption } from "./getColumnOptionMap";

export type ColumnBundle<T> = {
  headers: ColumnOption<T>[];
  contents: ColumnOption<T>[];
  indexUntil: number;
};

/**
 * 連続する isRowHeader 毎に区切って配列化
 */
export const getColumnBundlesParRowHeader = <T>(p: {
  columnOptions: ColumnOption<T>[];
}): ColumnBundle<T>[] => {
  return p.columnOptions
    .reduce(({ result, before }, options) => {
      const current = options.isRowHeader;
      const isHeader = options.isRowHeader;
      const tail = result[result.length - 1] ?? ColumnBundle.init<T>();
      if (isHeader) {
        if (current === before || before == null) {
          tail.headers.push(options);
        } else {
          const indexUntil = ColumnBundle.getIndexUntil(result);
          result.push({
            headers: [options],
            contents: [],
            indexUntil,
          });
        }
      } else {
        tail.contents.push(options);
      }
      return {
        result,
        before: current,
      };
    }, {
      result: [ColumnBundle.init<T>()],
      before: undefined as (boolean | undefined),
    })
    .result;
};

const ColumnBundle = {
  init: <T>(): ColumnBundle<T> => ({
    headers: [],
    contents: [],
    indexUntil: 0,
  }),
  getIndexUntil: <T>(src: ColumnBundle<T>[]) => {
    return src
      .map((bundle) => bundle.headers.length + bundle.contents.length)
      .reduce((sum, it) => sum + it);
  },
};
