import { useCallback, useState } from "react";

export function useToggle(
  defaultValue: boolean = false,
): [boolean, () => void, (v: boolean) => void] {
  const [value, setValue] = useState(defaultValue);

  const toggle = useCallback(() => {
    setValue(!value);
  }, [setValue, value]);

  return [value, toggle, setValue];
}
