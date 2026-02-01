import { Router } from 'express';
import { authenticateApiKey } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { validateChatCompletionRequest } from '../middleware/validateChatCompletion';
import * as apiKeysController from '../controllers/apiKeysController';
import * as chatCompletionsController from '../controllers/chatCompletionsController';
import * as metricsController from '../controllers/metricsController';

const router = Router();

// Dashboard / internal API (no API key required for now; in production use admin auth)
router.post('/api/keys', apiKeysController.createKey);
router.get('/api/keys', apiKeysController.listKeys);
router.delete('/api/keys/:id', apiKeysController.deleteKey);
router.get('/api/metrics', metricsController.getMetrics);

// OpenAI-compatible endpoint: requires API key, rate limit, validation
router.post(
  '/v1/chat/completions',
  authenticateApiKey,
  validateChatCompletionRequest,
  chatCompletionsController.handleChatCompletions
);

// Deployment endpoints
import * as deploymentsController from '../controllers/deploymentsController';
router.post('/api/deployments', deploymentsController.createDeployment);
router.get('/api/deployments', deploymentsController.listDeployments);
router.delete('/api/deployments/:id', deploymentsController.deleteDeployment);

export default router;
