'use client';

import { useState } from 'react';

const DEFAULT_API_URL = 'http://localhost:4000';
const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  DEFAULT_API_URL;

interface DeploymentItem {
    id: string;
    name: string;
    modelType: string;
    status: 'provisioning' | 'running' | 'failed' | 'stopped';
    createdAt: string;
}

interface DeploymentsSectionProps {
    deployments: DeploymentItem[];
    loading: boolean;
    onDeploymentCreated: () => void;
    onDeploymentDeleted: () => void;
}

const MODEL_OPTIONS = [
    'Llama-2-7b',
    'Llama-2-13b',
    'Llama-2-70b',
    'Mistral-7B',
    'Mixtral-8x7B',
    'Falcon-40B',
];

export function DeploymentsSection({
    deployments,
    loading,
    onDeploymentCreated,
    onDeploymentDeleted,
}: DeploymentsSectionProps) {
    const [name, setName] = useState('');
    const [modelType, setModelType] = useState(MODEL_OPTIONS[0]);
    const [deploying, setDeploying] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const createDeployment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setDeploying(true);
        try {
            const res = await fetch(`${API_BASE}/api/deployments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), modelType }),
            });
            if (!res.ok) throw new Error('Deployment failed');
            setName('');
            onDeploymentCreated();
        } catch (err) {
            console.error(err);
        } finally {
            setDeploying(false);
        }
    };

    const deleteDeployment = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`${API_BASE}/api/deployments/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            onDeploymentDeleted();
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section className="card">
            <h2 className="text-lg font-semibold text-sky-400">Deployed Models</h2>
            <p className="mt-1 text-sm text-slate-400">
                Deploy open-source models to dedicated workers.
            </p>

            <form onSubmit={createDeployment} className="mt-6 flex gap-3 flex-wrap">
                <input
                    type="text"
                    className="input w-48"
                    placeholder="Deployment name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={deploying}
                    required
                />
                <select
                    className="input w-48"
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    disabled={deploying}
                >
                    {MODEL_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
                <button type="submit" className="btn-primary" disabled={deploying}>
                    {deploying ? 'Deploying…' : 'Deploy Model'}
                </button>
            </form>

            <div className="mt-8">
                <h3 className="text-sm font-medium text-slate-400">Active Deployments</h3>
                {loading ? (
                    <p className="mt-2 text-sm text-slate-500">Loading…</p>
                ) : deployments.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No active deployments.</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {deployments.map((d) => (
                            <li
                                key={d.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/60 bg-slate-800/30 px-4 py-3"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-200">{d.name}</span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${d.status === 'running' ? 'bg-green-500/20 text-green-400' :
                                                d.status === 'provisioning' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {d.status}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono text-slate-500">
                                        {d.modelType}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>
                                        Created: {new Date(d.createdAt).toLocaleDateString()}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-danger text-sm"
                                        onClick={() => deleteDeployment(d.id)}
                                        disabled={deletingId === d.id}
                                    >
                                        {deletingId === d.id ? 'Deleting…' : 'Terminate'}
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
