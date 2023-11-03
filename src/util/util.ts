export function throttled<A extends unknown[]>(
  cb: (...args: A) => void,
  delay: number,
): (...args: A) => void {
  let timeout: NodeJS.Timeout | undefined;
  let nextArgs: A;

  return (...args: A) => {
    if (timeout) {
      nextArgs = args;
    } else {
      cb(...args);

      timeout = setTimeout(() => {
        if (nextArgs) {
          cb(...nextArgs);
          nextArgs = undefined;
        }
        timeout = undefined;
      }, delay);
    }
  };
}

export function shuffle<T>(arr: T[]): T[] {
  arr = [...arr];
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const j = Math.floor(Math.random() * len);
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }
  return arr;
}
