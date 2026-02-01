'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TimeSeriesPoint {
  timestamp: string;
  requestCount: number;
  tokenCount: number;
}

interface MetricsSectionProps {
  apiBase: string;
}

export function MetricsSection({ apiBase }: MetricsSectionProps) {
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/metrics?hours=${hours}`);
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const data = await res.json();
        if (!cancelled) {
          const series = Array.isArray(data.timeSeries) ? data.timeSeries : [];
          setTimeSeries(
            series.map((p: TimeSeriesPoint) => ({
              ...p,
              time: p.timestamp
                ? new Date(p.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '',
            }))
          );
        }
      } catch {
        if (!cancelled) setTimeSeries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMetrics();
    const t = setInterval(fetchMetrics, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [apiBase, hours]);

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-sky-400">Usage metrics</h2>
          <p className="mt-1 text-sm text-slate-400">
            Request and token volume over time (global).
          </p>
        </div>
        <select
          className="input w-auto"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={72}>Last 72 hours</option>
          <option value={168}>Last 7 days</option>
        </select>
      </div>

      <div className="mt-6 h-80">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            Loading…
          </div>
        ) : timeSeries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            No usage data yet. Make some requests with an API key.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timeSeries}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="requestCount"
                name="Requests"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tokenCount"
                name="Tokens"
                stroke="#4ade80"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
