import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { client } from '@/lib/api';
import { refreshToken } from '@/lib/tokenRefresh';
import {
  fetchSubscriptionStatus,
  SubscriptionPlan,
  UserSubscriptionStatus,
} from '@/lib/subscriptionApi';

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
  subscription: UserSubscriptionStatus | null;
  plans: SubscriptionPlan[];
  subscriptionLoading: boolean;
  refetchSubscription: () => Promise<void>;
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
  const [subscription, setSubscription] = useState<UserSubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const loadSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    try {
      const data = await fetchSubscriptionStatus();
      setSubscription(data.subscription);
      setPlans(data.plans);
    } catch {
      setSubscription(null);
      setPlans([]);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let res = await client.auth.me();

      // If 401 — try silent refresh and retry once
      if (!res?.data) {
        const newToken = await refreshToken();
        if (newToken) {
          res = await client.auth.me();
        }
      }

      if (res?.data) {
        setUser(res.data as User);
        await loadSubscription();
      } else {
        setUser(null);
        setSubscription(null);
        setPlans([]);
      }
    } catch (err) {
      // Try silent refresh on error (e.g. 401 thrown as exception)
      try {
        const newToken = await refreshToken();
        if (newToken) {
          const res = await client.auth.me();
          if (res?.data) {
            setUser(res.data as User);
            await loadSubscription();
            return;
          }
        }
      } catch {
        // Refresh also failed — fall through to error state
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUser(null);
      setSubscription(null);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [loadSubscription]);

  const login = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
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
    subscription,
    plans,
    subscriptionLoading,
    refetchSubscription: loadSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
