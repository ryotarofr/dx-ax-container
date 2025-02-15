import { Dispatch, SetStateAction } from "react";

/**
 * useState() の戻り値の型と、これについての Utilities
 */
export type State<T> = [T, Dispatch<SetStateAction<T>>];
export type StateObj<T> = { get: T; set: Dispatch<SetStateAction<T>> };
export type StateArgs<T>
  = State<T>
  | StateObj<T>;
export type OptionalState<T>
  = State<T>
  | [undefined, undefined];
export type OptionalStateArgs<T>
  = OptionalState<T>
  | StateObj<T>
  | undefined;

export const State = (() => {
  return {
    optionalFromArgs: <T>(
      optional: OptionalStateArgs<T>,
    ): OptionalState<T> => {
      if (Array.isArray(optional)) return optional;
      if (optional == null) return [undefined, undefined];
      return [optional.get, optional.set];
    },
    from: <T>(
      args: StateArgs<T>,
    ): State<T> => {
      if (Array.isArray(args)) return args;
      return [args.get, args.set];
    },
  };
})();
