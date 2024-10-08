import cookie from "cookie";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { WithChildren } from "../util/WithChildren";

export interface CookiesContextValue {
  cookies: Record<string, string>;
  setCookie: (
    key: string,
    value: string | ((prev: string | undefined) => string),
  ) => void;
}

export const CookiesContext = createContext<CookiesContextValue>({
  cookies: {},
  setCookie: () => {},
});

export function CookiesProvider({
  children,
}: WithChildren): React.ReactElement {
  const [cookies, setCookies] = useState(cookie.parse(document.cookie ?? ""));

  // Refresh cookies on load
  useEffect(() => {
    const cookies = cookie.parse(document.cookie ?? "");
    Object.entries(cookies).forEach(([key, value]) => {
      document.cookie = cookie.serialize(key, value, {
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    });
  }, []);

  const setCookie: CookiesContextValue["setCookie"] = useCallback(
    (key, value) => {
      setCookies((cookies) => {
        const actualValue =
          typeof value === "string" ? value : value(cookies[key]);
        document.cookie = cookie.serialize(key, actualValue, {
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });
        cookies[key] = actualValue;
        return { ...cookies };
      });
    },
    [setCookies],
  );

  return (
    <CookiesContext.Provider value={{ cookies, setCookie }}>
      {children}
    </CookiesContext.Provider>
  );
}
