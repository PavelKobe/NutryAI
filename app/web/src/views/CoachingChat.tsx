'use client';

import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  CoachingError,
  fetchCoachingMessages,
  fetchCoachingStatus,
  sendCoachingMessage,
  type CoachingMessage,
  type CoachingStatus,
} from '@/lib/coachingApi';
import CoachingPaywallModal from '@/components/coaching/CoachingPaywallModal';

const POLL_INTERVAL_MS = 12_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CoachingChat() {
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [status, setStatus] = useState<CoachingStatus | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const lastIdRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCoachingMessages(0), fetchCoachingStatus()])
      .then(([page, st]) => {
        if (cancelled) return;
        setMessages(page.items);
        lastIdRef.current = page.last_id;
        setStatus(st);
      })
      .catch((err) => {
        console.error('Failed to load coaching chat:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Polling
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const page = await fetchCoachingMessages(lastIdRef.current);
        if (page.items.length > 0) {
          setMessages((prev) => [...prev, ...page.items]);
          lastIdRef.current = page.last_id;
        }
      } catch (err) {
        console.error('Coaching messages polling error:', err);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refetchStatus = async () => {
    try {
      const st = await fetchCoachingStatus();
      setStatus(st);
    } catch (err) {
      console.error('Failed to refetch status:', err);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const created = await sendCoachingMessage(text);
      setMessages((prev) => [...prev, created]);
      lastIdRef.current = created.id;
      setInput('');
    } catch (err) {
      if (err instanceof CoachingError && err.code === 'coaching_inactive') {
        await refetchStatus();
        setShowPaywall(true);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Сопровождение">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        </div>
      </AppLayout>
    );
  }

  const hasActive = status?.has_active === true;

  return (
    <AppLayout title="Сопровождение">
      <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Header */}
        <div className="mb-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Личный нутрициолог</p>
            {hasActive ? (
              <p className="text-xs text-emerald-400">Подписка активна</p>
            ) : (
              <p className="text-xs text-slate-500">История сообщений</p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 mb-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1 text-white">
                Напишите своему нутрициологу
              </h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Расскажите о своих целях, питании или задайте любой вопрос.
                Мы ответим в течение дня.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isClient = msg.sender_role === 'client';
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isClient ? 'justify-end' : 'justify-start'}`}
              >
                {!isClient && (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isClient
                      ? 'bg-emerald-500 text-white rounded-br-md'
                      : 'bg-slate-800 text-slate-200 rounded-bl-md'
                  }`}
                >
                  <div>{msg.content}</div>
                  <div
                    className={`text-[10px] mt-1 ${
                      isClient ? 'text-emerald-100/80' : 'text-slate-500'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </div>
                </div>
                {isClient && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input or paywall banner */}
        <div className="sticky bottom-20 bg-slate-950 pt-2 pb-2">
          {hasActive ? (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && handleSend()
                }
                placeholder="Напишите сообщение..."
                className="bg-slate-800 border-slate-700 text-white rounded-xl"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  Сопровождение неактивно
                </p>
                <p className="text-xs text-slate-400">
                  Продлите для отправки сообщений
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowPaywall(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                Продлить
              </Button>
            </div>
          )}
        </div>
      </div>

      <CoachingPaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        mode={status?.status === 'expired' ? 'extend' : 'activate'}
      />
    </AppLayout>
  );
}
