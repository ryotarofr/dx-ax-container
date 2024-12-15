import clsx from "clsx";
import {
  ComponentProps,
  ComponentPropsWithRef,
  KeyboardEventHandler,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Input } from "@/components/ui/form/Input";
import { useFocus } from "@/fn/state/useFocus";
import { Override } from "@/type/Override";
import { Position } from "@/type/Position";

import styles from "./ComboBox.module.scss";
import { Option } from "./Option";

/**
 * コンボボックス
 *
 * デフォルトでは、選択肢に一致する入力以外はバリデーション後に弾かれる。<br>
 * ※ この時、直前の有効な入力が保持される。（ form の状態としては invalid なため、 submit は防止できる）
 */
export const ComboBox = <
  T extends Record<string, string>,
  Value extends ((FreeInput extends true ? string : keyof T) | undefined),
  FreeInput extends boolean = false,
>({
  suggestions: propsSuggestions,
  value: _currentKey,
  setValue: propsSetValue,
  freeInput = false as FreeInput,
  filterable = false,
  children,
  disabled,
  ...wrappedProps
}: Override<
  /** root要素に渡す */
  Omit<ComponentPropsWithRef<typeof Input>, "type">,
  {
    /**
     * 補完候補とラベルのMap
     */
    suggestions: T | undefined;
    /** 入力値 */
    value: Value | undefined;
    /** 入力結果を取得 */
    setValue: (input: Value | undefined) => void;
    /**
     * `true`なら入力による絞り込みが可能。
     * デフォルトは`false`。
     */
    filterable?: boolean;
    /**
     * 自由入力 trueなら、補完候補以外の入力値を許容する
     * @defaultValue false
     */
    freeInput?: FreeInput;
    disabled?: ComponentProps<typeof Input>["disabled"];
  }
>): ReactNode => {
  const currentKey = (() => {
    if (_currentKey == null) return placeholderKey;
    return _currentKey as string;
  })();
  const datalistId = useId();
  const required = wrappedProps.required;
  const readOnly = wrappedProps.readOnly;
  const suggestions: [Value, string][] = Array.isArray(propsSuggestions)
    ? propsSuggestions
    : Object.entries(propsSuggestions ?? {}) as [Value, string][];
  const suggestionMap: Record<string, string> = Array.isArray(propsSuggestions)
    ? Object.fromEntries(propsSuggestions)
    : propsSuggestions ?? {};

  const findViewValue = (key?: string): string => {
    if (key == null) return "";
    const value = suggestionMap[key];
    if (value != null) return value;
    if (reservedKeys.includes(key)) return "";
    return key;
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [rawInput, setRawInput] = useState<string>("");
  const [initTrigger, setInitTrigger] = useState(false);
  const init = () => setInitTrigger((prev) => !prev);

  // 描画選択肢
  const options = [
    [placeholderKey as Value, wrappedProps.placeholder ?? ""],
    ...suggestions,
  ] satisfies [Value, string][];
  const optionMap: Record<string, string> = Object.fromEntries(options);
  const sortedOptions = (() => {
    const entries = options
      .sort(([, prevValue], [, nextValue]) =>
        sortWithArray(prevValue, nextValue)(reservedKeys));
    if (!filterable) return entries;
    const input = rawInput;
    const inputWithoutCase = input.toLocaleLowerCase();
    return entries
      .sort()
      .sort(([, prevValue], [, nextValue]) =>
        sortWithIncludes(prevValue, nextValue)(inputWithoutCase))
      .sort(([, prevValue], [, nextValue]) =>
        sortWithIncludes(prevValue, nextValue)(input))
      .sort(([, prevValue], [, nextValue]) =>
        sortWithStartsWith(prevValue, nextValue)(inputWithoutCase))
      .sort(([, prevValue], [, nextValue]) =>
        sortWithStartsWith(prevValue, nextValue)(input));
  })();
  // 選択肢が更新され、且つ該当するkeyが消失していたら値を初期化
  useEffect(() => {
    if (Object.keys(suggestionMap).length === 0) return;
    if (!_currentKey) return;
    if (suggestionMap[_currentKey.toString()]) return;
    propsSetValue(undefined);
  }, [JSON.stringify(suggestionMap)]);

  // 選択肢表示時に選択中要素までスクロール
  const focus = useFocus(sortedOptions.map(([key]) => ({ id: key?.toString() ?? "" })));

  // 選択肢の描画位置の更新
  const [suggestPos, setSuggestPos] = useState({
    ...Position.init(),
    width: 10,
  });
  useEffect(() => {
    const ref = inputRef.current;
    if (!ref) return;
    if (!focus.active) return;
    const viewportHeight = window.innerHeight;
    const rect = ref.getBoundingClientRect();
    if (viewportHeight - rect.top < (rect.height * 6)) {
      setSuggestPos({
        x: rect.left,
        y: rect.top - (rect.height * 5),
        width: rect.width,
      });
    } else {
      setSuggestPos({
        x: rect.left,
        y: rect.top + rect.height,
        width: rect.width,
      });
    }
  }, [focus.active]);

  const setValue = (key: string = "") => {
    const inputIsEmpty = key === "";
    const value = suggestionMap[key];
    if (key === placeholderKey) {
      return propsSetValue(undefined as Value);
    }
    if (!freeInput && inputIsEmpty) {
      propsSetValue(undefined as Value);
      return;
    }
    if (value !== undefined) {
      propsSetValue(key as Value);
      return;
    }
    if (!freeInput) return;
    return propsSetValue(value as Value);
  };

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    switch (event.key) {
      case "Escape": (() => {
        focus.setActive(false);
      })(); break;
      case "ArrowUp": (() => {
        if (disabled) return;
        focus.prev();
        if (!focus.active && !event.repeat) {
          setValue(focus.getPrev());
        }
      })(); break;
      case "ArrowDown": (() => {
        if (disabled) return;
        focus.next();
        if (!focus.active && !event.repeat) {
          setValue(focus.getNext());
        }
      })(); break;
      case "Enter": (() => {
        if (disabled) return;
        if (focus.active) {
          setValue(focus.id);
        }
        focus.setActive((prev) => !prev);
      })(); break;
      case "Backspace": (() => {
        if (disabled) return;
        if (filterable) return;
        setValue("");
      })(); break;
      case "Tab": (() => {
        focus.setActive(false);
      })(); break;
    }
  };

  return (
    <Input
      data-testid="combobox"
      {...wrappedProps}
      ref={inputRef}
      className={clsx(
        styles.ComboBox,
        wrappedProps.className,
      )}
      containerProps={{
        ...wrappedProps.containerProps,
        onBlur: (event) => {
          if (event.currentTarget === event.target) return;
          focus.setActive(false);
        },
      }}
      type="text"
      autoComplete="off"
      list={datalistId}
      deps={[initTrigger]}
      value={currentKey}
      setValue={setValue}
      valueMapper={findViewValue}
      setRawValue={setRawInput}
      readOnly={readOnly || filterable ? readOnly : "trueWithoutLabel"}
      disabled={disabled}
      customValidations={{
        suggestionContainValue: {
          message: "選択肢に無い値は無効です",
          checkIsInvalid: (key) => {
            if (key === "" && !required) return;
            if (freeInput) return;
            if (optionMap[key] !== undefined) return;
            return true;
          },
        },
        ...wrappedProps.customValidations,
      }}
      onPointerDown={() => focus.setActive(true)}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        tabIndex={-1}
        className={clsx(
          styles.ComboBoxThumb,
          disabled && styles.Disabled,
        )}
        disabled={disabled}
        onPointerDown={() => focus.setActive((prev) => !prev)}
      >{!disabled && focus.active ? "▲" : "▼"}</button>
      <ul
        ref={focus.setScrollRef}
        style={{
          top: suggestPos.y,
          left: suggestPos.x,
          width: suggestPos.width,
        }}
        className={clsx(
          styles.DataList,
          (disabled || !focus.active) && styles.Hidden,
        )}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
        }}
      >
        {sortedOptions
          .map(([key, value]) => ([key?.toString() ?? "", value] as const))
          .map(([key, value]) =>
            <Option
              key={key}
              ref={focus.setContentRefs(key)}
              dataKey={key}
              value={value}
              focused={key === focus.id}
              selected={key === currentKey}
              setCurrentKey={(it) => !readOnly && setValue(it)}
              setFocused={focus.setActive}
              setFocusedOption={focus.setById}
              init={init}
              readOnly={!!wrappedProps.readOnly}
            />,
          )
        }
      </ul>
      {children}
    </Input>
  );
};

const sortWithStartsWith
  = (prev: string, next: string) =>
    (input: string) =>
      next.startsWith(input) || !prev.startsWith(input)
        ? 1 : -1;
const sortWithIncludes
  = (prev: string, next: string) =>
    (input: string) =>
      next.includes(input) || !prev.includes(input)
        ? 1 : -1;
const sortWithArray
  = (prev: string, next: string) =>
    (array: string[]) => {
      const getSortOrder = (it: string): number => {
        const index = array.indexOf(it);
        return index === -1
          ? array.length
          : index;
      };
      return getSortOrder(prev) - getSortOrder(next);
    };

const placeholderKey = "";
const reservedKeys = [placeholderKey];
