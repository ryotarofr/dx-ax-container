import { Dispatch, SetStateAction } from "react";

type Setter<T> = Dispatch<SetStateAction<T>>;
export const Setter = (() => {
  const toValue = <T>(setStateAction: SetStateAction<T>, prev: T) =>
    setStateAction instanceof Function
      ? setStateAction(prev)
      : setStateAction;
  return {
    toValue,
    from: <T>(use: (getNext: (prev: T) => T) => void): Setter<T> =>
      (setStateAction) =>
        use((prev) => toValue(setStateAction, prev)),
  };
})();
