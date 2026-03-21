import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from './BottomNav';
import { User, LogOut } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, loading, logout: authLogout } = useAuth();

  // Redirect to landing if not authenticated (once loading is done)
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [loading, user, navigate]);

  const handleLogout = async () => {
    await authLogout();
    navigate('/');
  };

  // Don't render content until auth check completes
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <h1 className="text-lg font-bold text-white">
              {title || 'NutriAI'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <User className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pb-24 pt-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}