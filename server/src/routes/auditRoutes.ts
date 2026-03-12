import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config';
import { requireAuth } from '../middleware/auth';
import { readAuditLogs, writeAuditLogs, logger } from '../services/storageService';
import { AuditEntry } from '../types';

const router = Router();

router.post('/log', requireAuth, (req, res) => {
    try {
        const entry = req.body as AuditEntry;
        if (!entry || !entry.type || !entry.actor) {
            return res.status(400).json({ error: 'Invalid audit entry' });
        }

        const userId = (req as any).userId;
        const serverTimestamp = Date.now();

        const auditPayload = JSON.stringify({
            ...entry,
            userId,
            serverTimestamp
        });

        const signature = crypto
            .createHmac('sha256', env.effectiveJwtSecret)
            .update(auditPayload)
            .digest('hex');

        const signedEntry = {
            ...entry,
            userId,
            serverTimestamp,
            signature,
            signer: 'unity-catalog-acs-bff'
        };

        const auditLogs = readAuditLogs();
        auditLogs.unshift(signedEntry);

        const limitedLogs = auditLogs.slice(0, 5000);
        writeAuditLogs(limitedLogs);

        res.json({ status: 'success' });
    } catch (err) {
        logger.error({ err }, '[BFF] Audit Log Write Error');
        res.status(500).json({ error: 'Failed to save audit log' });
    }
});

router.get('/log', requireAuth, (req, res) => {
    res.json(readAuditLogs());
});

/**
 * Opportunity: Remote Log Collection
 * Endpoint to receive client-side logs/errors for central monitoring
 */
router.post('/log/ui', (req, res) => {
    const { level, message, details, traceId } = req.body;

    logger.info({
        clientLevel: level || 'INFO',
        clientMessage: message,
        clientDetails: details,
        traceId,
        source: 'UI_CLIENT'
    }, '[UI-LOG] Received remote message');

    res.status(204).send();
});

export default router;
