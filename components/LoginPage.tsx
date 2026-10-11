'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logoDataUrl } from '@/assets/logo';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter both username and password'); return; }
    setIsLoading(true); setError('');
    const result = await login(username.trim(), password);
    if (!result.success) setError(result.error || 'Invalid credentials');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'radial-gradient(1200px 650px at 50% -12%, #F1EAE0 0%, #E4DACD 55%, #D8CBBA 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="card p-8" style={{ boxShadow: '0 20px 60px -10px rgba(33,21,38,.22)' }}>
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 flex-shrink-0" style={{ boxShadow: '0 4px 16px rgba(124,45,59,.25)' }}>
              <img src={logoDataUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-display font-semibold text-ink" style={{ fontSize: 22 }}>Hari Prabodham</h1>
            <p className="text-xs font-semibold mt-1" style={{ color: '#8F8494' }}>Bhuj — Data Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#8F8494' }}>Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="input" placeholder="Enter username"
                required disabled={isLoading} autoComplete="username" autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#8F8494' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="Enter password"
                  required disabled={isLoading} autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#8F8494' }} tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-xl text-sm font-medium" style={{ background: '#F4DEDA', color: '#C1544A' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 mt-2">
              {isLoading ? <><Loader className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

