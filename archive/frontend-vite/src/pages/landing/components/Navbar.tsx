import { useState, useEffect } from 'react';

const navLinks = [
  { label: 'Как это работает', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Тарифы', href: '#pricing' },
];

type NavbarProps = { onAuthStart: () => void | Promise<void> };

export default function Navbar({ onAuthStart }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'backdrop-blur-xl border-b border-white/5'
          : ''
      }`}
      style={{
        background: scrolled
          ? 'rgba(5,13,5,0.85)'
          : 'transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 cursor-pointer group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, #00e676 0%, #1de9b6 100%)',
              boxShadow: '0 0 16px rgba(0,230,118,0.4)',
            }}
          >
            <i className="ri-leaf-line text-black text-base" style={{ fontWeight: 700 }} />
          </div>
          <div className="flex items-baseline gap-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="text-white font-black text-lg tracking-tight leading-none">
              Nutri
            </span>
            <span
              className="font-black text-lg tracking-tight leading-none"
              style={{ color: '#00e676' }}
            >
              AI
            </span>
            <span className="text-gray-400 font-medium text-sm leading-none ml-0.5">
              Diary
            </span>
          </div>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm text-gray-300 hover:text-emerald-400 transition-colors duration-200 relative group cursor-pointer whitespace-nowrap"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={() => void onAuthStart()}
            className="px-5 py-2 rounded-full text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-black transition-all duration-200 whitespace-nowrap cursor-pointer border-0"
            style={{ boxShadow: '0 0 20px rgba(0,230,118,0.3)' }}
          >
            Начать бесплатно
          </button>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden flex flex-col gap-1.5 cursor-pointer p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ background: 'rgba(5,13,5,0.95)', backdropFilter: 'blur(20px)' }}
      >
        <div className="px-6 py-4 flex flex-col gap-4 border-t border-white/10">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-gray-300 hover:text-emerald-400 transition-colors py-1 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => void onAuthStart()}
            className="px-5 py-2.5 rounded-full text-sm font-medium bg-emerald-500 text-black text-center whitespace-nowrap cursor-pointer border-0 w-full"
          >
            Начать бесплатно
          </button>
        </div>
      </div>
    </nav>
  );
}
