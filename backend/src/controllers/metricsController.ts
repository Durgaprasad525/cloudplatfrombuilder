import { Request, Response } from 'express';
import {
  getUsageByApiKey,
  getUsageTimeSeries,
  getGlobalUsageTimeSeries,
} from '../services/usageTracker';

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const { apiKeyId, hours = '24' } = req.query;
  const hoursNum = Math.min(168, Math.max(1, parseInt(String(hours), 10) || 24));

  try {
    if (apiKeyId && typeof apiKeyId === 'string') {
      const [summary, timeSeries] = await Promise.all([
        getUsageByApiKey(apiKeyId),
        getUsageTimeSeries(apiKeyId, 60, hoursNum),
      ]);
      res.json({
        apiKeyId,
        summary,
        timeSeries: timeSeries.map((p) => ({
          ...p,
          timestamp: typeof p.timestamp === 'string' ? p.timestamp : (p.timestamp as Date)?.toISOString?.() ?? p.timestamp,
        })),
      });
    } else {
      const timeSeries = await getGlobalUsageTimeSeries(hoursNum);
      res.json({
        timeSeries: timeSeries.map((p) => ({
          ...p,
          timestamp: typeof p.timestamp === 'string' ? p.timestamp : (p.timestamp as Date)?.toISOString?.() ?? p.timestamp,
        })),
      });
    }
  } catch (err) {
    console.error('Get metrics error:', err);
    res.status(500).json({
      error: { message: 'Failed to get metrics', code: 'internal_error' },
    });
  }
}
