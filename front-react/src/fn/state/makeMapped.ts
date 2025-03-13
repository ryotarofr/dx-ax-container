import { Setter } from "@/type/Setter";
import { State, StateArgs } from "@/type/State";

/**
 * stateの値を変換したstateを生成するwrapper
 */
export const makeMapped = <T, Mapped>(
  /** 基になるstate */
  stateArgs: StateArgs<T>,
  mapper: {
    /** 元の値から変換先の値を生成 */
    to: (state: T) => Mapped;
    /** 変換先の値から元の値を生成 */
    from: (mapped: Mapped) => T;
  },
): State<Mapped> => {
  const [state, setState] = State.from(stateArgs);

  return [
    mapper.to(state),
    (setStateAction) => setState((prev) => {
      const mappedPrev = mapper.to(prev);
      const next = Setter.toValue(setStateAction, mappedPrev);
      return mapper.from(next);
    }),
  ];
};
