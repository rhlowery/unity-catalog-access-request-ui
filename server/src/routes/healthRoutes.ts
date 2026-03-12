import { Router } from 'express';
import { env } from '../config';
import { checkStorageHealth } from '../services/storageService';
import { getMetrics, getContentType } from '../services/metricsService';

const router = Router();

router.get('/health', (_req, res) => {
    const checks = {
        storage: checkStorageHealth() ? 'ok' : 'error',
        jwtConfigured: !!env.effectiveJwtSecret ? 'ok' : 'warning',
        env: env.NODE_ENV
    };
    const allOk = Object.values(checks).every(v => v !== 'error');
    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ok' : 'degraded',
        version: '1.2.0',
        checks
    });
});

router.get('/metrics', async (_req, res) => {
    res.set('Content-Type', getContentType());
    res.end(await getMetrics());
});

export default router;
