'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { persistSessionToken, registerWithEmail } from '@/lib/emailAuth';
import { loginWithYandex, loginWithVkId } from '@/lib/oauthAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PrivacyPolicyDialog } from '@/views/landing/PrivacyPolicyDialog';
import { TermsOfUseDialog } from '@/views/landing/TermsOfUseDialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, 'Введите email').email('Некорректный email'),
  password: z.string().min(8, 'Пароль не короче 8 символов'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо согласие, чтобы продолжить' }),
  }),
});

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', consent: false as unknown as true },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: FormValues) => {
    try {
      const { token } = await registerWithEmail(
        values.email,
        values.password,
        values.name?.trim() || undefined,
      );
      persistSessionToken(token);
      toast.success('Добро пожаловать в NutryAI!');
      await new Promise((r) => setTimeout(r, 700));
      window.location.href = '/onboarding';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка регистрации';
      form.setError('email', { message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold">Регистрация</h1>
          <p className="text-slate-400 text-sm mt-1">Укажите email и пароль (мин. 8 символов)</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя (необязательно)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="name"
                      className="bg-slate-950 border-slate-700"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      className="bg-slate-950 border-slate-700"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      className="bg-slate-950 border-slate-700"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consent"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        id="consent"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5 border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="consent"
                      className="text-sm font-normal text-slate-300 leading-snug cursor-pointer"
                    >
                      Согласен с{' '}
                      <button
                        type="button"
                        onClick={() => setTermsOpen(true)}
                        className="text-emerald-400 hover:underline underline-offset-2"
                      >
                        пользовательским соглашением
                      </button>
                      {' '}и{' '}
                      <button
                        type="button"
                        onClick={() => setPrivacyOpen(true)}
                        className="text-emerald-400 hover:underline underline-offset-2"
                      >
                        политикой обработки данных
                      </button>
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Создание…' : 'Зарегистрироваться'}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-2 text-slate-500">или</span>
          </div>
        </div>

        <button
          type="button"
          onClick={loginWithYandex}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
            <path d="M13.32 7.2H12.2C10.62 7.2 9.78 8.01 9.78 9.25C9.78 10.65 10.38 11.33 11.6 12.15L12.77 12.94L9.72 17.6H7.8L10.58 13.38C9.09 12.34 8.2 11.31 8.2 9.34C8.2 7.25 9.62 5.8 12.18 5.8H14.94V17.6H13.32V7.2Z" fill="white"/>
          </svg>
          Зарегистрироваться через Яндекс
        </button>

        <button
          type="button"
          onClick={loginWithVkId}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#0077FF"/>
            <path d="M12.9 16.4C8.6 16.4 6.1 13.5 6 8.6H8.1C8.2 12.3 9.8 13.9 11.1 14.2V8.6H13.1V11.6C14.3 11.5 15.6 10 16 8.6H18C17.7 10.3 16.4 11.8 15.5 12.4C16.4 12.9 17.9 14.2 18.5 16.4H16.3C15.8 14.9 14.6 13.7 13.1 13.6V16.4H12.9Z" fill="white"/>
          </svg>
          Зарегистрироваться через VK
        </button>

        <p className="text-center text-sm text-slate-400">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
      <PrivacyPolicyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <TermsOfUseDialog open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  );
}
