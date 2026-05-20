'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const encoded = btoa(`${username}:${password}`);
    const res = await fetch('/api/admin?action=rooms', {
      headers: { Authorization: `Basic ${encoded}` },
    });

    setLoading(false);
    if (res.ok) {
      sessionStorage.setItem('vikas75_admin_auth', encoded);
      router.push('/admin/dashboard');
    } else {
      setError('Invalid credentials');
    }
  }

  return (
    <div className="min-h-screen bg-[#1a3a6e] flex items-center justify-center p-6">
      <div className="bg-[#faf8f0] rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="font-[family-name:var(--font-oswald)] text-[#1a3a6e] text-3xl uppercase tracking-widest mb-6 text-center">
          Admin
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[#1a3a6e] font-bold text-sm mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-2 border-[#1a3a6e]/20 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-[#1a3a6e]"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-[#1a3a6e] font-bold text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-[#1a3a6e]/20 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-[#1a3a6e]"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  );
}
