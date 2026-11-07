import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearTokens, hasSession, saveTokens, setSignedOutHandler } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasSession());

  useEffect(() => {
    setSignedOutHandler(() => setUser(null));
    if (!hasSession()) return;
    api
      .get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const accept = (data) => {
    saveTokens(data.tokens);
    setUser(data.user);
    return data.user;
  };

  // Returns the user, or { otp_required, challenge, ... } when a one-time code is needed.
  const login = useCallback(async (identifier, password) => {
    const data = await api.post('/auth/login', { identifier, password }, { auth: false });
    return data.otp_required ? data : accept(data);
  }, []);

  const verifyOtp = useCallback(async (challenge, code) => {
    const data = await api.post('/auth/verify-otp', { challenge, code }, { auth: false });
    return accept(data);
  }, []);

  const logout = useCallback(async () => {
    const old = clearTokens();
    setUser(null);
    if (old && old.refresh) {
      try {
        await api.post('/auth/logout', { refresh_token: old.refresh }, { auth: false });
      } catch {
        /* the token expires by itself if this fails */
      }
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, verifyOtp, logout }), [user, loading, login, verifyOtp, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
