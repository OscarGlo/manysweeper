import React, { useCallback, useContext, useEffect, useState } from "react";
import { CookiesContext } from "../contexts/Cookies";

export interface CookieInputRenderProps<T> {
  value: T;
  onChange: (value: T) => void;
}

export interface CookieInputProps<T> {
  cookieName: string;
  parse?: (cookie: string) => T;
  defaultValue?: T;
  render: (props: CookieInputRenderProps<T>) => React.ReactElement;
  dynamic?: boolean;
  onChange?: (value: T) => void;
}

export function CookieInput<T>({
  cookieName,
  defaultValue,
  parse,
  render,
  onChange,
  dynamic = true,
}: CookieInputProps<T>) {
  const { cookies, setCookie } = useContext(CookiesContext);

  const parseValue = useCallback(
    (cookie: string) => (parse ? parse(cookie) : (cookie as T)),
    [parse],
  );

  const [value, setValue] = useState<T>(
    parseValue(cookies[cookieName]) ?? defaultValue,
  );

  useEffect(() => {
    if (cookies[cookieName]) onChange?.(parseValue(cookies[cookieName]));
  }, [onChange]);

  const onInputChange = useCallback(
    (value: T) => {
      if (dynamic) setCookie(cookieName, value.toString());
      onChange?.(value);
      setValue(value);
    },
    [dynamic, setCookie, setValue, onChange],
  );

  return render({ value, onChange: onInputChange });
}
