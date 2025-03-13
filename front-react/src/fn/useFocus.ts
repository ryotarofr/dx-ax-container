import { SetStateAction, useDeferredValue, useRef, useState } from "react";

import { Setter } from "@/type/Setter";

import { groupByToMap } from "../groupBy";
import { range } from "../range";

/**
 * 子要素の疑似フォーカス状態を実現するState
 *
 * @example
 * ```
 * const data = []; // 元データ
 * // 今回は index を id として用いる
 * const focus = useFocus(data.map((_, index) => ({ id: `index` })));
 *
 * return (
 *   <div ref={focus.setScrollRef}>
 *     {data.map((datum, index) => (
 *       // index を id として contentRefs を設定
 *       <div ref={focus.setContentRefs(index)}
 *         className={clsx(
 *         )}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export const useFocus = (order: {
  id: string;
  parentId?: string;
}[], _options?: {
  init?: string;
  loop?: boolean;
  checkVisibility?: boolean;
}) => {
  const options = {
    init: _options?.init,
    loop: _options?.loop ?? false,
    checkVisibility: _options?.checkVisibility ?? false,
  };

  const ref = useRef<HTMLElement | null>(null);
  const setRef = (value: HTMLElement | null) => ref.current = value;
  const refs = useRef(new Map<string, HTMLElement | null>());
  const setRefs = (id: string) => (ref: HTMLElement | null) => {
    refs.current.set(id, ref);
  };

  const ids = order.map((it) => it.id)
    .filter((id) => !options.checkVisibility
      || refs.current.get(id)?.checkVisibility());
  const grouped = groupByToMap(order, (it) => it.parentId);
  const scrollTo = getScrollFn(ref.current, refs.current, ids);

  const [active, setActive] = useState(false);
  const [_focusedId, _setFocusedId] = useState<string | undefined>(options.init);
  const setFocusedId = (setStateAction: SetStateAction<string | undefined>, options?: {
    withoutScroll?: boolean;
  }) =>
    _setFocusedId((prev) => {
      const next = Setter.toValue(setStateAction, prev);
      if (!options?.withoutScroll)
        scrollTo(next, prev);
      return next;
    });
  const focusedId = useDeferredValue(_focusedId);
  const getIndex = (id: string | undefined = focusedId) => {
    if (id == null) return;
    const raw = ids.indexOf(id);
    return raw === -1 ? undefined : raw;
  };
  const focusedIndex = getIndex();
  const setFocusedIndex = (localOptions?: Options) =>
    Setter.from<number | undefined>((getNext) => setFocusedId((prevId) => {
      const max = ids.length - 1;
      const prevIndex = getIndex(prevId);
      const nextIndexRaw = getNext(prevIndex);
      const nextIndex = nextIndexRaw == null
        ? undefined
        : localOptions?.loop ?? options.loop
          ? getLoopedIndex(nextIndexRaw, max)
          : getMoldedIndex(nextIndexRaw, max);
      const nextId = ids[nextIndex ?? -1];
      localOptions?.effect?.({ next: { id: nextId } });
      return nextId;
    }));

  const getParentId = (id: string | undefined = focusedId) => {
    return Array.from(grouped.entries())
      .find(([, value]) => value.find((it) => it.id === id) != null)
      ?.[0] ?? undefined;
  };
  const getSiblings = (id: string | undefined = focusedId) => {
    return grouped.get(getParentId(id))?.map((it) => it.id);
  };
  const setBySiblingIndex = getScopedFocusIndexSetter(
    setFocusedId,
    options,
    getSiblings(focusedId) ?? [],
    scrollTo,
  );

  return {
    scrollRef: ref.current,
    setScrollRef: setRef,
    setContentRefs: setRefs,
    active,
    id: focusedId,
    index: focusedIndex,
    setById: setFocusedId,
    setByIndex: setFocusedIndex(),
    setActive,
    getPrev: () => focusedIndex == null ? undefined : ids[focusedIndex - 1],
    getNext: () => focusedIndex == null ? undefined : ids[focusedIndex + 1],
    prev: (options?: Options) => setFocusedIndex(options)((prev) => (prev ?? +1) - 1),
    next: (options?: Options) => setFocusedIndex(options)((prev) => (prev ?? -1) + 1),
    setBySiblingIndex,
    prevSibling: () => setBySiblingIndex((prev) => (prev ?? +1) - 1),
    nextSibling: () => setBySiblingIndex((prev) => (prev ?? -1) + 1),
    parent: () => setFocusedId(getParentId()),
  };
};

const getScopedFocusIndexSetter = (
  focusIdSetter: Setter<string | undefined>,
  options: { loop: boolean },
  ids: string[],
  scrollFn: (
    toId: string | undefined,
    fromId: string | undefined,
  ) => void,
) => Setter.from<number | undefined>((getNext) => focusIdSetter((prevId) => {
  const max = ids.length - 1;
  const prevIndexRaw = prevId == null
    ? -1
    : ids.indexOf(prevId);
  const prevIndex = prevIndexRaw === -1
    ? undefined
    : prevIndexRaw;
  const nextIndexRaw = getNext(prevIndex);
  const nextIndex = nextIndexRaw == null
    ? undefined
    : options.loop
      ? getLoopedIndex(nextIndexRaw, max)
      : getMoldedIndex(nextIndexRaw, max);
  const nextId = ids[nextIndex ?? -1];
  scrollFn(nextId, prevId);
  return nextId;
}));

const getScrollFn = (
  parent: HTMLElement | null,
  contents: Map<string, HTMLElement | null>,
  ids: string[],
) => (
  toId: string | undefined,
  fromId: string | undefined,
) => {
  if (!parent) return;
  if (toId == null) return;
  const to = ids.indexOf(toId);
  const from = fromId == null
    ? undefined
    : ids.indexOf(fromId);
  if (to < 0) return;
  const behavior = "instant";
  const direction = from == null
    ? "here"
    : from == to
      ? "here"
      : from < to
        ? "forward"
        : "backward";
  const scrollTargetIndexRaw = direction === "forward"
    ? to + 2
    : direction === "backward"
      ? to - 2
      : to;
  const maxIndex = ids.length - 1;
  const scrollTargetIndex = getMoldedIndex(scrollTargetIndexRaw, maxIndex);
  const scrollTargetId = ids[scrollTargetIndex];
  if (scrollTargetId == null) return;

  const visibleContents = ids
    .map((id) => contents.get(id))
    .filter((content) => content?.checkVisibility())
    .flatMap((content) => content ? [content] : []);
  const searchRange = range(to, { from: from ?? to, backwardExpansion: 3 })
    .reverse();
  const searchedVisibleContents = searchRange
    .map((index) => visibleContents[index])
    .flatMap((content) => content ? [content] : []);

  const edgeContent = searchedVisibleContents.find(() => true);
  edgeContent?.scrollIntoView({
    block: "nearest",
    behavior,
  });

  const viewedEdge = searchRange.length !== searchedVisibleContents.length;
  if (viewedEdge) {
    if (from == null) return;
    if (from < to) {
      parent.scroll({
        top: parent.scrollHeight - parent.clientHeight,
        behavior,
      });
    }
    if (to < from) {
      parent.scroll({
        top: 0,
        behavior,
      });
    }
    return;
  }
};

const getLoopedIndex = (raw: number, max: number) => {
  const modded = raw % (max + 1);
  return modded < 0
    ? (max + 1) + modded
    : modded;
};

const getMoldedIndex = (raw: number, max: number) => {
  return Math.max(0, Math.min(raw, max));
};

type Options = {
  loop?: boolean;
  effect?: (event: { next: { id: string | undefined } }) => void;
};
