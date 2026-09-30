'use client';

import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? 'Erreur de connexion.');
      setSubmitting(false);
      return;
    }
    window.location.href = '/';
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-raised px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 border border-line bg-paper p-10">
        <div>
          <h1 className="font-serif text-3xl text-ink">CLEF</h1>
          <p className="mt-1 text-sm text-ink-soft">Calcul de Loyer, Emprunt & Financement</p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-ink-soft">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border-0 border-b border-line bg-transparent py-2 text-ink focus:border-accent focus:outline-none focus:ring-0"
          />
        </div>
        {error && <p className="text-sm text-warn">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          Se connecter
        </button>
      </form>
    </main>
  );
}
