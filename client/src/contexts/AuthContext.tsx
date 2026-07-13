import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { authApi } from '@/services/auth.service';
import { clearAuthSession, readAuthSession, writeAuthSession } from '@/utils/authStorage';

interface AuthContextValue {
  isAuthenticated: boolean;
  loginId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState(() => readAuthSession());

  const login = useCallback(async (loginId: string, password: string) => {
    const response = await authApi.login(loginId, password);
    const next = { token: response.token, loginId: response.loginId, expiresAt: response.expiresAt };
    writeAuthSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session),
      loginId: session?.loginId ?? null,
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
