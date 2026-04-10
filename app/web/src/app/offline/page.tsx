export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="none"
        style={{ width: 64, height: 64, marginBottom: 24 }}
      >
        <rect width="32" height="32" rx="8" fill="#15803d" />
        <path
          fill="#bbf7d0"
          d="M16 5c-5 9-5 16 0 22 5-6 5-13 0-22zm0 22c-2-3-3-7-3-11 0-4 1-8 3-11 2 3 3 7 3 11 0 4-1 8-3 11z"
        />
      </svg>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
        Нет подключения к интернету
      </h1>

      <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 0 32px', maxWidth: 360 }}>
        Проверьте подключение к сети и попробуйте снова.
      </p>

      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional: <Link> needs JS which may not load offline */}
      <a
        href="/"
        style={{
          display: 'inline-block',
          padding: '12px 32px',
          backgroundColor: '#15803d',
          color: '#f8fafc',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Попробовать снова
      </a>
    </div>
  );
}
