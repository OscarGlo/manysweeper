import cookie from "cookie";
import React, { createContext, useCallback, useState } from "react";
import { WithChildren } from "../util/WithChildren";

export interface CookiesContextValue {
  cookies: Record<string, string>;
  setCookie: (key: string, value: string) => void;
}

export const CookiesContext = createContext<CookiesContextValue>({
  cookies: {},
  setCookie: () => {},
});

export function CookiesProvider({
  children,
}: WithChildren): React.ReactElement {
  const [cookies, setCookies] = useState(cookie.parse(document.cookie ?? ""));

  const setCookie = useCallback(
    (key: string, value: string) => {
      document.cookie = cookie.serialize(key, value, {
        maxAge: 30 * 24 * 60 * 60,
      });
      cookies[key] = value;
      setCookies(cookies);
    },
    [cookies, setCookies],
  );

  return (
    <CookiesContext.Provider value={{ cookies, setCookie }}>
      {children}
    </CookiesContext.Provider>
  );
}
