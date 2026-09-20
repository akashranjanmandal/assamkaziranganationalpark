'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await signIn('credentials', { password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(true);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="login-screen">
      <form className="login-box" onSubmit={handleSubmit}>
        <div className="login-logo">
          Assam <span>Wild</span> Safari
        </div>
        <div className="login-sub">Admin Panel</div>
        <label className="l-label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          className="l-input"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button className="l-btn" type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Enter Admin Panel'}
        </button>
        {error && <p className="l-err">Incorrect password.</p>}
      </form>
    </div>
  );
}
