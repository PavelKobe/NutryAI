import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import LandingHome from './landing/LandingHome';

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await client.auth.me();
        if (user?.data) {
          navigate('/dashboard');
          return;
        }
      } catch {
        // not logged in
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleAuthStart = useCallback(async () => {
    await client.auth.toLogin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return <LandingHome onAuthStart={handleAuthStart} />;
}
