import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });

    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => {
    const startSession = ({ user: sessionUser, token }) => {
      tokenStore.set(token);
      setUser(sessionUser);
    };
    return {
      user,
      loading,
      login: async (email, password) => startSession(await api.post('/auth/login', { email, password })),
      register: async (name, email, password) =>
        startSession(await api.post('/auth/register', { name, email, password })),
      logout: () => {
        tokenStore.clear();
        setUser(null);
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
