'use client';

import { useState } from 'react';
import type { ApiKeyItem } from '@/app/page';

const DEFAULT_API_URL = 'http://localhost:4000';
const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  DEFAULT_API_URL;

interface ApiKeysSectionProps {
  keys: ApiKeyItem[];
  loading: boolean;
  onKeyCreated: () => void;
  onKeyDeleted: () => void;
}

export function ApiKeysSection({
  keys,
  loading,
  onKeyCreated,
  onKeyDeleted,
}: ApiKeysSectionProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setNewKey(null);
    try {
      const res = await fetch(`${API_BASE}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Create failed');
      const data = await res.json();
      setNewKey(data.key);
      setName('');
      onKeyCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onKeyDeleted();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <section className="card">
      <h2 className="text-lg font-semibold text-sky-400">API Keys</h2>
      <p className="mt-1 text-sm text-slate-400">
        Create and manage keys for the OpenAI-compatible API.
      </p>

      <form onSubmit={createKey} className="mt-6 flex gap-3">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="Key name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={creating}
        />
        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? 'Creating…' : 'Create key'}
        </button>
      </form>

      {newKey && (
        <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
          <p className="text-sm text-slate-300">
            Copy your key now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-slate-800/80 px-2 py-1.5 text-sm text-sky-300">
              {newKey}
            </code>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => copyKey(newKey)}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-medium text-slate-400">Existing keys</h3>
        {loading ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No keys yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/60 bg-slate-800/30 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-slate-200">{k.name}</span>
                  <span className="ml-2 font-mono text-sm text-slate-500">
                    …{k.prefix}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span>{k.usageCount} requests</span>
                  <span>
                    Last used:{' '}
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleString()
                      : 'Never'}
                  </span>
                  <button
                    type="button"
                    className="btn-danger text-sm"
                    onClick={() => deleteKey(k.id)}
                    disabled={deletingId === k.id}
                  >
                    {deletingId === k.id ? 'Deleting…' : 'Revoke'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
