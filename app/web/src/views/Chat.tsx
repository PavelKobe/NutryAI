'use client';

import { useEffect, useState, useRef } from 'react';
import { client } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Trash2, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import UpgradeSubscriptionModal, {
  type UpgradeTrigger,
} from '@/components/subscription/UpgradeSubscriptionModal';

const CHAT_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/1042541/2026-03-20/1897eaa0-5e6b-4976-97be-55c0abde28e2.png';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  'Что лучше есть перед тренировкой?',
  'Как увеличить потребление белка?',
  'Полезные перекусы до 150 ккал',
  'Чем заменить сладкое?',
];

/** Разбирает тип ошибки из сообщения и возвращает trigger для модала или null */
function parseSubscriptionError(message?: string): UpgradeTrigger | null {
  if (!message) return null;
  const lower = message.toLowerCase();
  if (lower.includes('subscription_expired') || lower.includes('срок подписки')) return 'subscription_expired';
  if (lower.includes('trial_expired') || lower.includes('пробный период')) return 'trial_expired';
  if (lower.includes('daily_limit_exceeded') || lower.includes('дневной лимит')) return 'limit';
  if (lower.includes('429')) return 'limit';
  return null;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitTrigger, setLimitTrigger] = useState<UpgradeTrigger>('limit');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await client.entities.chat_messages.query({
        sort: 'created_at',
        limit: 50,
      });
      const items: Message[] = (res?.data?.items || []).map((m: { id: number; role: string; content: string }) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      setMessages(items);
    } catch (err) {
      console.error('Load chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionError = (trigger: UpgradeTrigger) => {
    // Убираем пустое сообщение ассистента
    setMessages((prev) => prev.slice(0, -1));
    setLimitTrigger(trigger);
    setShowLimitModal(true);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    // Save user message
    try {
      await client.entities.chat_messages.create({
        data: { role: 'user', content: text.trim() },
      });
    } catch {
      // continue even if save fails
    }

    // Get AI response
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Load profile for context
      let profileContext = '';
      try {
        const profileRes = await client.entities.user_profiles.query({ limit: 1 });
        const profiles = profileRes?.data?.items || [];
        if (profiles.length > 0) {
          const p = profiles[0];
          profileContext = `\nПрофиль пользователя: цель — ${p.goal === 'lose' ? 'похудение' : p.goal === 'gain' ? 'набор массы' : 'поддержание веса'}, ${p.target_calories} ккал/день, Б${p.target_protein}г, Ж${p.target_fat}г, У${p.target_carbs}г. Аллергии: ${p.allergies || 'нет'}. Кухня: ${p.cuisine_preferences || 'Русская'}.`;
        }
      } catch {
        // no profile
      }

      const chatHistory = messages.slice(-10).map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      let fullResponse = '';
      await client.ai.gentxt({
        messages: [
          {
            role: 'system',
            content: `Ты — NutriAI, дружелюбный и профессиональный ИИ-нутрициолог. Отвечай на русском языке.
Ты помогаешь пользователям с вопросами о питании, диетах, рецептах и здоровом образе жизни.
Давай конкретные, практичные советы. Используй российские продукты и реалии.
Важно: ты НЕ врач. При серьёзных проблемах рекомендуй обратиться к специалисту.${profileContext}`,
          },
          ...chatHistory,
          { role: 'user', content: text.trim() },
        ],
        model: 'anthropic/claude-sonnet-4.5',
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          fullResponse += chunk.content || '';
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
            return updated;
          });
        },
        onComplete: async () => {
          // Save assistant message
          try {
            await client.entities.chat_messages.create({
              data: { role: 'assistant', content: fullResponse },
            });
          } catch {
            // continue
          }
        },
        onError: (error: { message?: string; status?: number; body?: unknown }) => {
          // Проверяем subscription-related ошибки (429)
          const body = error.body as { detail?: { error?: string } } | undefined;
          const errorCode = body?.detail?.error;

          if (errorCode === 'subscription_expired') {
            handleSubscriptionError('subscription_expired');
            return;
          }
          if (errorCode === 'trial_expired') {
            handleSubscriptionError('trial_expired');
            return;
          }
          if (errorCode === 'daily_limit_exceeded' || error.status === 429) {
            handleSubscriptionError('limit');
            return;
          }

          // Проверяем по тексту сообщения (fallback)
          const trigger = parseSubscriptionError(error?.message);
          if (trigger) {
            handleSubscriptionError(trigger);
            return;
          }

          // Обычная ошибка
          toast.error(error?.message || 'Ошибка ИИ');
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: 'Извините, произошла ошибка. Попробуйте ещё раз.',
            };
            return updated;
          });
        },
      });
    } catch (err: unknown) {
      // Обработка ошибок подписки на уровне catch (если SDK не вызвал onError)
      const msg = err instanceof Error ? err.message : String(err);
      const trigger = parseSubscriptionError(msg);
      if (trigger) {
        handleSubscriptionError(trigger);
      } else {
        toast.error('Не удалось отправить сообщение');
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      // Delete all messages from DB
      for (const msg of messages) {
        if (msg.id) {
          try {
            await client.entities.chat_messages.delete({ id: String(msg.id) });
          } catch {
            // continue
          }
        }
      }
      setMessages([]);
      toast.success('Чат очищен');
    } catch {
      toast.error('Ошибка очистки чата');
    }
  };

  if (loading) {
    return (
      <AppLayout title="ИИ-нутрициолог">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="ИИ-нутрициолог">
      <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Header actions */}
        {messages.length > 0 && (
          <div className="flex justify-end mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-slate-500 hover:text-red-400 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Очистить
            </Button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <img
                src={CHAT_IMG}
                alt="ИИ-нутрициолог"
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-2 border-indigo-500/30"
              />
              <h3 className="text-lg font-semibold mb-2">Привет! Я ваш ИИ-нутрициолог 👋</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                Задайте любой вопрос о питании, диетах или рецептах
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 border border-slate-700 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-200 rounded-bl-md'
                }`}
              >
                {msg.content || (
                  <span className="flex items-center gap-2 text-slate-400">
                    <Sparkles className="w-3 h-3 animate-pulse" /> Думаю...
                  </span>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-20 bg-slate-950 pt-2 pb-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Задайте вопрос о питании..."
              className="bg-slate-800 border-slate-700 text-white rounded-xl"
              disabled={sending}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <UpgradeSubscriptionModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        trigger={limitTrigger}
      />
    </AppLayout>
  );
}
