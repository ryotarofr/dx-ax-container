export const isTargetingControllable = (event: {
  currentTarget: EventTarget;
  target: EventTarget;
}) => {
  const parentBound = event.currentTarget as HTMLElement;
  const childBound = event.target as HTMLElement;
  const controllableTagsSelector = [
    "input:not(:disabled):not(:read-only)",
    "label",
    "button:not(:disabled)",
  ].join(",");
  const focusableParent = childBound.closest(controllableTagsSelector);
  const hasInnerControlable = parentBound.contains(focusableParent);
  return hasInnerControlable;
};
