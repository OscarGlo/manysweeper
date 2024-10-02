import { DependencyList, RefObject, useEffect } from "react";

export const useResizeObserver = (
  ref: RefObject<HTMLElement>,
  callback: () => void,
  deps: DependencyList,
) => {
  useEffect(() => {
    if (ref.current == null) return;

    const observer = new ResizeObserver(callback);

    observer.observe(ref.current);
    return () =>
      ref.current?.removeEventListener("resize", () =>
        observer.unobserve(ref.current),
      );
  }, [ref, ...deps]);
};
