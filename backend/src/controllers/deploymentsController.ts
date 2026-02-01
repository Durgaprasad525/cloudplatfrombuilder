import { Request, Response } from 'express';
import * as deploymentService from '../services/deploymentService';

export async function createDeployment(req: Request, res: Response): Promise<void> {
    const { name, modelType } = req.body as { name?: string; modelType?: string };

    if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
            error: { message: 'Missing or invalid "name"', code: 'invalid_request' },
        });
        return;
    }

    if (!modelType || typeof modelType !== 'string' || !modelType.trim()) {
        res.status(400).json({
            error: { message: 'Missing or invalid "modelType"', code: 'invalid_request' },
        });
        return;
    }

    try {
        const deployment = await deploymentService.createDeployment(name.trim(), modelType.trim());
        res.status(201).json(deployment);
    } catch (err) {
        console.error('Create deployment error:', err);
        res.status(500).json({
            error: { message: 'Failed to create deployment', code: 'internal_error' },
        });
    }
}

export async function listDeployments(_req: Request, res: Response): Promise<void> {
    try {
        const deployments = await deploymentService.listDeployments();
        res.json({ deployments });
    } catch (err) {
        console.error('List deployments error:', err);
        res.status(500).json({
            error: { message: 'Failed to list deployments', code: 'internal_error' },
        });
    }
}

export async function deleteDeployment(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const deleted = await deploymentService.deleteDeployment(id);
        if (!deleted) {
            res.status(404).json({
                error: { message: 'Deployment not found', code: 'not_found' },
            });
            return;
        }
        res.status(204).send();
    } catch (err) {
        console.error('Delete deployment error:', err);
        res.status(500).json({
            error: { message: 'Failed to delete deployment', code: 'internal_error' },
        });
    }
}
