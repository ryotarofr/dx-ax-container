import {
  Dispatch,
  SetStateAction,
} from "react";

import { NestedKeyOf } from "@/type/NestedKeyOf";
import { NestedValueOf } from "@/type/NestedValueOf";

type PartializedTuple<T> = T extends [infer Head, ...infer Tails]
  ? [Head] | [Head, ...PartializedTuple<Tails>]
  : never;

/**
 * 部分化した`setState`を生成するための関数
 *
 * @param setState - `useState()`が返す Setter 関数
 * @returns `(...keys: 階層キー) => 部分化済み setState()`
 *
 * @example
 * 用例:
 * ```
 * const [obj, setObj] = useState<{ mode: string }>({ mode: "initMode"});
 * const mode = obj.mode
 * const setMode = partializeSetState(setObj)("mode");
 * // この時、[mode, setMode] は下記と同義。
 * // const [mode, setMode] = useState<string>("initMode");
 * ```
 */
export const partializeSetStateDeep
  = <T>(setState: Dispatch<SetStateAction<T>>) =>
    /**
     * 階層キーを元に`setState`を部分化
     *
     * @param keys - stateのネストされたキーのパス
     * @returns 部分化済み`setState()`
     */
    <Keys extends PartializedTuple<NestedKeyOf<T>>>(...keys: Keys) =>
      keys.reduce((prev, it) =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        partializeSetState(prev /* setState */)(it /* Keys[index] */) /* T[Keys[..index]] */,
      setState) as Dispatch<SetStateAction<NestedValueOf<T, Keys>>>;
/**
 * partializeSetState の1階層のみ版
 */
export const partializeSetState
  = <T>(setState: Dispatch<SetStateAction<T>>) =>
    <Key extends keyof T>(key: Key): Dispatch<SetStateAction<T[Key]>> =>
      (setStateAction) =>
        setState((prev) => {
          const next = setStateAction instanceof Function
            ? setStateAction(prev?.[key] as T[Key])
            : setStateAction;
          if (Array.isArray(prev) && typeof key === "number") {
            const prevArray = [ ...prev];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            prevArray[key] = next;
            return [ ...prevArray ] as T;
          } else {
            return {
              ...prev,
              ...{
                [key]: next,
              },
            };
          }
        });
