import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/client';

export interface DeploymentRecord {
  id: string;
  name: string;
  modelType: string;
  status: 'provisioning' | 'running' | 'failed' | 'stopped';
  createdAt: Date;
  updatedAt: Date;
}

interface DeploymentRow {
  id: string;
  name: string;
  model_type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function rowToRecord(row: DeploymentRow): DeploymentRecord {
  return {
    id: row.id,
    name: row.name,
    modelType: row.model_type,
    status: row.status as DeploymentRecord['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDeployment(name: string, modelType: string): Promise<DeploymentRecord> {
  const id = uuidv4();
  const status = 'provisioning';

  await query(
    `INSERT INTO deployments (id, name, model_type, status) VALUES ($1, $2, $3, $4)`,
    [id, name, modelType, status]
  );

  // Simulate provisioning delay
  setTimeout(async () => {
    try {
      await query(
        `UPDATE deployments SET status = 'running', updated_at = NOW() WHERE id = $1`,
        [id]
      );
    } catch (err) {
      console.error(`Failed to update deployment status for ${id}:`, err);
    }
  }, 5000 + Math.random() * 5000); // 5-10 seconds delay

  return {
    id,
    name,
    modelType,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function listDeployments(): Promise<DeploymentRecord[]> {
  const result = await query<DeploymentRow>(
    `SELECT id, name, model_type, status, created_at, updated_at
     FROM deployments ORDER BY created_at DESC`
  );
  return result.rows.map(rowToRecord);
}

export async function deleteDeployment(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM deployments WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
