import React, { createContext, useEffect, useState } from "react";
import { WithChildren } from "../util/WithChildren";
import { User } from "../../model/User";

export interface UserValue {
  loading: boolean;
  user?: User;
  refresh: () => void;
}

export const UserContext = createContext<UserValue>({
  loading: false,
  refresh: () => {},
});

export function UserProvider({ children }: WithChildren) {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchUser() {
    const res = await fetch("/api/user");
    setLoading(false);
    setUser(res.ok ? await res.json() : null);
  }

  useEffect(() => {
    if (loading) fetchUser();
  }, [loading]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refresh: () => setLoading(true),
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
