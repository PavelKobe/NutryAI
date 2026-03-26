import { useState } from 'react';

const FORM_URL = 'https://readdy.ai/api/form/d70ofppqa83q0hmd1e2g';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const body = new URLSearchParams({ email });
      await fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer
      className="relative pt-20 pb-8 px-6"
      style={{
        background: '#030a03',
        borderTop: '1px solid rgba(0,230,118,0.08)',
      }}
    >
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-1 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,230,118,0.5), transparent)',
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-12 border-b border-white/5">
          {/* Brand col */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                style={{
                  background: 'linear-gradient(135deg, #00e676 0%, #1de9b6 100%)',
                  boxShadow: '0 0 16px rgba(0,230,118,0.3)',
                }}
              >
                <i className="ri-leaf-line text-black text-base" style={{ fontWeight: 700 }} />
              </div>
              <div className="flex items-baseline gap-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span className="text-white font-black text-lg tracking-tight leading-none">Nutri</span>
                <span className="font-black text-lg tracking-tight leading-none" style={{ color: '#00e676' }}>AI</span>
                <span className="text-gray-400 font-medium text-sm leading-none ml-0.5">Diary</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
              Умный ИИ-нутрициолог в вашем кармане. Распознавание еды по фото,
              персональные планы питания и умный дневник — всё в одном приложении.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: 'ri-telegram-line', href: '#' },
                { icon: 'ri-vk-line', href: '#' },
                { icon: 'ri-instagram-line', href: '#' },
                { icon: 'ri-youtube-line', href: '#' },
              ].map((s) => (
                <a
                  key={s.icon}
                  href={s.href}
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#9ca3af',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,230,118,0.15)';
                    (e.currentTarget as HTMLElement).style.color = '#00e676';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,230,118,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.color = '#9ca3af';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <i className={s.icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-5">
            <h4 className="text-white font-semibold text-sm mb-4">Новости</h4>
            <p className="text-gray-500 text-sm mb-4">
              Получайте советы по питанию и обновления приложения
            </p>
            {submitted ? (
              <div
                className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(0,230,118,0.1)',
                  border: '1px solid rgba(0,230,118,0.3)',
                  color: '#00e676',
                }}
              >
                <i className="ri-check-line" /> Подписка оформлена!
              </div>
            ) : (
              <form
                data-readdy-form
                id="newsletter-footer"
                onSubmit={handleSubmit}
                className="flex flex-col gap-2"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="ваш@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0,230,118,0.4)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap transition-all duration-200 hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #00e676, #1de9b6)',
                    color: '#000',
                  }}
                >
                  {submitting ? 'Отправка...' : 'Подписаться'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-gray-600 text-sm">
            © 2026 NutriAI Diary. Все права защищены.
          </p>
          <div className="flex gap-4">
            {['Политика конфиденциальности', 'Условия использования'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-gray-600 text-xs hover:text-gray-400 transition-colors cursor-pointer"
              >
                {item}
              </a>
            ))}
          </div>
          <p className="text-gray-700 text-xs">
            ⚠️ NutriAI не заменяет консультацию врача-диетолога
          </p>
        </div>
      </div>
    </footer>
  );
}
