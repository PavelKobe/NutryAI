import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { client } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  userName: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await client.auth.me();
      if (res?.data) {
        setUser(res.data as User);
      } else {
        setUser(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async () => {
    try {
      setError(null);
      await client.auth.login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await client.auth.logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const userName = user?.name || user?.email || '';

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refetch: checkAuthStatus,
    isAdmin: user?.role === 'admin',
    userName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};