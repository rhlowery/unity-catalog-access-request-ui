import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config';
import { logger } from '../services/storageService';

export const generateCsrfToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

export const validateCsrf = (req: Request, res: Response, next: NextFunction): void => {
    const csrfToken = req.headers['x-csrf-token'] as string;
    const cookieToken = req.cookies['csrf_token'];

    if (req.method === 'GET') {
        return next();
    }

    const csrfEnabled = process.env.CSRF_ENABLED !== 'false';

    if (!csrfToken || !cookieToken) {
        logger.warn('[BFF] CSRF validation failed: missing token');
        if (csrfEnabled) {
            res.status(403).json({ error: 'CSRF validation failed' });
            return;
        }
    } else if (csrfEnabled && csrfToken !== cookieToken) {
        logger.warn({
            headerTokenLength: csrfToken?.length || 0,
            cookieTokenLength: cookieToken?.length || 0,
            match: csrfToken === cookieToken
        }, '[BFF] CSRF validation failed: token mismatch');
        res.status(403).json({ error: 'CSRF validation failed' });
        return;
    }

    next();
};
