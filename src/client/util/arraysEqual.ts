export function arraysEqual<T, R>(
  identity: (t: T) => R,
  a: T[],
  b: T[],
): boolean {
  const biden = b.map(identity);
  return a.length === b.length && a.every((e) => biden.includes(identity(e)));
}
