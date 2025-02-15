import clsx from "clsx";
import { forwardRef, ReactNode, ForwardedRef } from "react";

import styles from "./Option.module.scss";

/**
 * 選択肢
 */
export const Option = forwardRef(function Option({
  dataKey,
  value,
  focused,
  selected,
  setCurrentKey,
  setFocused,
  setFocusedOption,
  init,
  readOnly,
}: {
  dataKey: string;
  value: string;
  focused: boolean;
  selected: boolean;
  setCurrentKey: (dataKey: string) => void;
  setFocused: (focused: boolean) => void;
  setFocusedOption: (dataKey: string) => void;
  init: () => void;
  readOnly: boolean;
}, _ref: ForwardedRef<HTMLLIElement>): ReactNode {

  return (
    <li
      ref={_ref}
      className={clsx(
        styles.Option,
        readOnly && styles.ReadOnly,
        focused && styles.Focused,
        selected && styles.Selected,
      )}
      onPointerDown={() => {
        if (selected) {
          init();
        }
        setCurrentKey(dataKey);
        setFocusedOption(dataKey);
        setFocused(false);
      }}
    >{value}</li>
  );
});
