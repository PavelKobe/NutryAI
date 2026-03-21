import type { Metadata } from 'next';
import Login from '@/views/Login';

export const metadata: Metadata = {
  title: 'Вход',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <Login />;
}
