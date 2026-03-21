import type { Metadata } from 'next';
import Register from '@/views/Register';

export const metadata: Metadata = {
  title: 'Регистрация',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <Register />;
}
