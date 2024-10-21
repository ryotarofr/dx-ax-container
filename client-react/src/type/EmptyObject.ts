export type EmptyObject = Record<PropertyKey, never>;
export const EmptyObject = {
  init: (): EmptyObject => ({}),
  is: (it: unknown): it is EmptyObject =>
    typeof it === "object" && Object.keys(it).length === 0,
};