import { useState } from "react";

import { OptionalStateArgs, State } from "@/type/State";

/**
 * statePairがdefinedならそのまま返す。
 * statePairがundefinedなら内部的に用意したstateを返す。
 */
export const useOptional = <T>(
  statePairArgs: OptionalStateArgs<T>,
  init: T extends NonNullable<T> ? T : (T | undefined),
): State<T> => {
  const [pValue, pSetValue] = State.optionalFromArgs(statePairArgs);
  const [_value, _setValue] = useState(pValue ?? init);
  const hasPartial
    = pValue == null
    || pSetValue == null;

  return hasPartial
    ? [_value, _setValue] as State<T>
    : [pValue, pSetValue] as State<T>;
};
