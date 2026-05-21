'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoLockup from '@/components/ui/LogoLockup';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const credentials = btoa(`${user}:${pass}`);
      const res = await fetch('/api/admin?action=rooms', {
        headers: { Authorization: `Basic ${credentials}` },
      });
      if (res.status === 401) {
        setError('Invalid credentials');
      } else if (res.ok) {
        sessionStorage.setItem('vikas75_admin_creds', credentials);
        router.push('/admin/dashboard');
      } else {
        setError('Login failed');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#0d1b2e] flex flex-col items-center justify-center p-6">
      <LogoLockup size="sm" className="mb-10" />

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="font-[family-name:var(--font-bebas)] text-white text-3xl tracking-widest mb-6 text-center">
          Admin Login
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
              Username
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-[family-name:var(--font-inter)] focus:outline-none focus:border-[#FF9933]/60"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
              Password
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white font-[family-name:var(--font-inter)] focus:outline-none focus:border-[#FF9933]/60"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center font-[family-name:var(--font-inter)]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !user || !pass}
            className="w-full h-12 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 text-white font-[family-name:var(--font-bebas)] text-xl tracking-widest rounded-xl transition-all active:scale-95"
          >
            {loading ? 'Logging in…' : 'Login →'}
          </button>
        </form>
      </div>
    </main>
  );
}
