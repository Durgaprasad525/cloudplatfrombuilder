'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiKeysSection } from '@/components/ApiKeysSection';
import { MetricsSection } from '@/components/MetricsSection';
import { DeploymentsSection } from '@/components/DeploymentsSection';

const DEFAULT_API_URL = 'http://localhost:4000';
const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  DEFAULT_API_URL;

export default function DashboardPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/keys`);
      if (!res.ok) throw new Error('Failed to fetch keys');
      const data = await res.json();
      setKeys(data.keys || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
    const t = setInterval(fetchKeys, 15000);
    return () => clearInterval(t);
  }, [fetchKeys]);


  const handleKeyCreated = () => {
    fetchKeys();
  };

  const handleKeyDeleted = () => {
    fetchKeys();
  };

  // Deployments state
  const [deployments, setDeployments] = useState<any[]>([]); // Use 'any' or import proper type to avoid churn
  const [deploymentsLoading, setDeploymentsLoading] = useState(true);

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/deployments`);
      if (!res.ok) throw new Error('Failed to fetch deployments');
      const data = await res.json();
      setDeployments(data.deployments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setDeploymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
    const t = setInterval(fetchDeployments, 5000); // Polling for status updates (provisioning -> running)
    return () => clearInterval(t);
  }, [fetchDeployments]);

  return (
    <div className="space-y-12">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}. API base: {API_BASE}. If deployed, set NEXT_PUBLIC_API_URL to your backend URL and redeploy the frontend.
        </div>
      )}


      <ApiKeysSection
        keys={keys}
        loading={loading}
        onKeyCreated={handleKeyCreated}
        onKeyDeleted={handleKeyDeleted}
      />

      <DeploymentsSection
        deployments={deployments}
        loading={deploymentsLoading}
        onDeploymentCreated={fetchDeployments}
        onDeploymentDeleted={fetchDeployments}
      />

      <MetricsSection apiBase={API_BASE} />

    </div>
  );
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
}
