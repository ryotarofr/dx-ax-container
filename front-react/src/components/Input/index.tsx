import clsx from "clsx";
import {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  DependencyList,
  Dispatch,
  FormEvent,
  ForwardedRef,
  ReactNode,
  SetStateAction,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import CrossIcon from "@/assets/icon/cross.svg?react";
import ResetIcon from "@/assets/icon/reset.svg?react";
import { Label } from "@/components/ui/form/Label";
import { Warnings } from "@/components/ui/form/Warnings";
import { ToolTip } from "@/components/ui/ToolTip";
import { getMappedObject } from "@/fn/getMappedObject";
import { TabIndex, TabIndexes } from "@/fn/state/useTabIndexes";
import { InvalidInfo } from "@/type/InvalidInfo";
import { Override } from "@/type/Override";

import { WarnMap, getWarnMap } from "./getWarnMap";
import styles from "./Input.module.scss";

/**
 * 入力欄のスタイル統一と挙動実装のための汎用`<input />`ラッパー。
 */
export const Input = forwardRef(function Input({
  tabIndex,
  label,
  value: propsValue,
  setValue: propsSetValue,
  valueMapper = (it) => it,
  setRawValue,
  deps: initDeps = [],
  children,
  containerProps,
  stretch = false,
  simplified = false,
  suppressWheelPropergation = false,
  showClearButton: propsShowClearButton = true,
  customValidations,
  readOnly = false,
  cooldownDuration = 0,
  hiddenWarning = false,
  onInvalid,
  autoComplete = "off",
  ...wrappedProps
}: Override<
  /** `<input />`要素に渡すAttributes */
  ComponentPropsWithoutRef<"input">,
  {
    tabIndex?: TabIndex;
    /** 入力タイプ */
    type: Required<ComponentPropsWithoutRef<"input">>["type"];
    /** ラベル */
    label?: string;
    /** 現在の値 */
    value?: string;
    /** 入力値を利用する関数 */
    setValue?: (input: string) => void;
    /** 値描画直前に変換を行う手段を提供する関数 */
    valueMapper?: (currentInput: string) => string;
    /** 生の入力値(バリデーション無し)を利用する関数 */
    setRawValue?: (currentInput: string) => void;
    /**
     * 描画初期化用の依存関係
     */
    deps?: DependencyList;
    /** 子要素 */
    children?: ReactNode;
    /** 外縁要素に渡すAttributes */
    containerProps?: ComponentPropsWithoutRef<"fieldset">;
    /** trueなら入力に合わせてリサイズ */
    stretch?: boolean;
    /** trueなら簡略化表示 */
    simplified?: boolean;
    /** trueならマウスホイールでページ全体が動かないようになる */
    suppressWheelPropergation?: boolean;
    /** trueならクリアボタンを表示 */
    showClearButton?: boolean;
    /** カスタムバリデーション */
    customValidations?: Record<string, {
      message: string;
      checkIsInvalid: (value: string) => boolean | undefined;
    }>;
    /**
     * `true`なら読込専用。`"trueWithoutLabel"`の際は描画には反映しない。
     * デフォルトは`false`。
     */
    readOnly?: boolean | "trueWithoutLabel";
    /**
     * カウントボタンを連打すると無限ループするためクールダウンを設ける。
     * デフォルトは `0`。
     */
    cooldownDuration?: number;
    /**
     * 警告非表示フラグ
     * デフォルトは `false`。
     */
    hiddenWarning?: boolean;
    /** invalid時に実行できるイベント関数 */
    onInvalid?: (event: FormEvent<HTMLInputElement>, options: {
      setRawValue: Dispatch<SetStateAction<string>>;
    }) => void;
    /** 補完キャッシュ設定。デフォルトはoff */
    autoComplete?: Required<ComponentPropsWithoutRef<"input">>["autoComplete"];
  }
>, _ref: ForwardedRef<HTMLInputElement>): ReactNode {
  const tabIndexes = TabIndexes.from(tabIndex);
  const disabled = wrappedProps.disabled;
  const inputId = useId();
  const required = wrappedProps.required;
  const ref = useRef<HTMLInputElement>(null);
  useImperativeHandle(_ref, () => ref.current as HTMLInputElement);

  const [value, setValue] = [propsValue, propsSetValue];
  const [currentValue, setCurrentValue] = useState<string>(value ?? "");
  useEffect(() => setCurrentValue(value ?? ""), [value]);
  useEffect(() => setRawValue?.(currentValue), [setRawValue, currentValue]);

  const warnMap = (() => {
    const defaultWarnMap: WarnMap = getWarnMap({
      ...wrappedProps,
      validities: ref.current?.validity,
    });
    const customWarnMap: WarnMap = getMappedObject(
      customValidations ?? {},
      ([, { message, checkIsInvalid }]) => ({
        invalid: checkIsInvalid(currentValue) ?? false,
        message,
      }),
    );
    return {
      ...defaultWarnMap,
      ...customWarnMap,
    };
  })();
  const hasInvalid = (() => {
    const invalidMessages
      = Object.values(warnMap)
        .map((it) => {
          if (!it) return;
          if (!it.invalid) return;
          return it.message;
        })
        .filter((it): it is string => !!it);
    const hasInvalid = invalidMessages.length !== 0;
    const invalidInfo: InvalidInfo = {
      messages: invalidMessages,
      label: label ?? "",
      currentValue,
    };
    const invalidInfoJson = JSON.stringify(invalidInfo);
    ref.current?.setCustomValidity(hasInvalid ? invalidInfoJson : "");
    return hasInvalid;
  })();
  useEffect(() => {
    if (hasInvalid) return;
    setValue?.(currentValue);
  }, [currentValue, hasInvalid]);

  const suppressScroll = (event: Event) =>
    event.stopPropagation();
  const conatinerRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (!suppressWheelPropergation) return;
    const ref = conatinerRef.current;
    if (!ref) return;
    ref.addEventListener("wheel", suppressScroll, { passive: false });
    return () => ref.removeEventListener("wheel", suppressScroll);
  }, [suppressWheelPropergation, conatinerRef]);

  const clearValue = () => setCurrentValue("");
  const showClearButton
    = propsShowClearButton
    && currentValue != null
    && currentValue !== "";
  const resetValue = () => setCurrentValue(wrappedProps.defaultValue?.toString() ?? value ?? "");
  useEffect(() => resetValue(), initDeps);
  const showResetButton
    = value
    && currentValue !== value;

  const showControls
    = label !== undefined
    && readOnly !== true
    && !disabled;

  const [coolingDown, setCoolingDown] = useState(false);
  const onChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (readOnly) return;
    if (disabled) return;
    if (cooldownDuration) {
      if (coolingDown) return;
      setCoolingDown(true);
      setTimeout(() => {
        setCoolingDown(false);
      }, cooldownDuration);
    }
    wrappedProps.onChange?.(event);
    const target = event.currentTarget;
    setCurrentValue(target.value);
  };

  return (
    <fieldset
      {...containerProps}
      data-testid="inputRoot"
      ref={conatinerRef}
      className={clsx(
        styles.Input,
        simplified && styles.Simplified,
        containerProps?.className,
      )}
    >
      {!simplified
        && <div
          className={clsx(styles.Header,
            label === undefined && styles.Hidden)}
        >
          <Label
            htmlFor={inputId}
            className={clsx(
              styles.Label,
            )}
            required={wrappedProps.required}
            readOnly={readOnly === true}
          >{label}</Label>
          <div className={clsx(
            styles.Controls,
            !showControls && styles.Hidden,
          )}
          >
            <button
              type="button"
              className={clsx(
                styles.ValueControllButton,
                !showClearButton && styles.Invisible,
              )}
              tabIndex={tabIndexes.latest}
              onClick={clearValue}
            >
              <CrossIcon />
            </button>
            <button
              type="button"
              className={clsx(
                styles.ValueControllButton,
                !showResetButton && styles.Invisible,
              )}
              tabIndex={tabIndexes.latest}
              onClick={resetValue}
            >
              <ResetIcon />
            </button>
          </div>
        </div>
      }
      <div
        className={styles.InputContainer}
      >
        {stretch
          && <div
            className={clsx(
              wrappedProps.className,
              styles.InputSizeDetector,
            )}
            data-placeholder={wrappedProps.placeholder}
          >{currentValue}</div>
        }
        <input
          data-testid={"rawInput"}
          {...wrappedProps}
          ref={ref}
          id={inputId}
          value={valueMapper(currentValue)}
          className={clsx(
            styles.RawInput,
            stretch && styles.Stretch,
            simplified && styles.Simplified,
            !simplified && styles.NotSimplified,
            required && (currentValue != "") && styles.Required,
            required && (currentValue == "" || currentValue == null || currentValue == undefined) && styles.RequiredNull,
            readOnly === true && styles.ReadOnly,
            wrappedProps.className,
          )}
          tabIndex={tabIndexes.latest}
          onChange={onChange}
          onInvalid={(event) => onInvalid?.(event, {
            setRawValue: setCurrentValue,
          })}
          onKeyDown={(event) => {
            if ((readOnly == true) && event.key !== "Tab") {
              event.preventDefault();
              return;
            }
            wrappedProps.onKeyDown?.(event);
          }}
          // マウスオーバー時のメッセージ表示を抑制するために空文字をデフォルト設定
          title={wrappedProps.title ?? ""}
          autoComplete={autoComplete}
        />
        <ToolTip
          simplified={true}
          className={styles.ToolTip}
          open={Object.keys(warnMap).length !== 0}
        >
          {!hiddenWarning && Object.values(warnMap).some((warn) => warn && warn.invalid) && (
            <Warnings warnMap={warnMap} />
          )}
        </ToolTip>
        {children}
      </div>
    </fieldset>
  );
});

declare module "react" {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;        // remember to make these attributes optional....
    webkitdirectory?: string;
  }
}
