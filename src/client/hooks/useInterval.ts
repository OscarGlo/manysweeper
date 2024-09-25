import { useEffect } from "react";

export function useInterval(
  callback: () => void,
  delay: number,
  deps: unknown[],
) {
  useEffect(() => {
    const interval = setInterval(callback, delay);
    return () => clearInterval(interval);
  }, deps);
}
