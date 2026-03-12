import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { isTokenRevoked } from '../services/revocationService';
import { logger } from '../services/storageService';
import { JwtPayload } from '../types';

export const resolveToken = (req: Request): string | null => {
    if (req.headers['authorization']) return req.headers['authorization'] as string;
    if (req.cookies['access_token']) return `Bearer ${req.cookies['access_token']}`;
    return null;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    let bffJwt = req.cookies['bff_jwt'];

    logger.debug({
        cookieNames: Object.keys(req.cookies),
        hasBffJwt: !!bffJwt
    }, '[BFF] Incoming authentication attempt');

    if (!bffJwt) {
        const authHeader = req.headers['authorization'] as string;
        if (authHeader?.startsWith('Bearer ')) {
            bffJwt = authHeader.slice(7);
        }
    }

    const hasLegacyCookie = !!req.cookies['access_token'];

    if (!bffJwt && !hasLegacyCookie) {
        logger.warn({
            hasBffJwt: !!bffJwt,
            hasLegacyCookie,
            cookies: Object.keys(req.cookies)
        }, '[BFF] Authorization failed: No tokens found in cookies');
        return res.status(401).json({ error: 'Unauthorized: No valid session token found' });
    }

    if (bffJwt) {
        try {
            const decoded = jwt.verify(bffJwt, env.effectiveJwtSecret, {
                issuer: 'unity-catalog-acs-bff',
                audience: 'unity-catalog-acs-ui',
            }) as JwtPayload;

            if (decoded.jti && isTokenRevoked(decoded.jti)) {
                throw new Error('Token has been revoked');
            }

            (req as any).userId = decoded.sub;
            (req as any).userGroups = decoded.groups || [];
            (req as any).userRole = decoded.role;
            (req as any).jwtPayload = decoded;

            return next();
        } catch (err: any) {
            const message = err.message;
            logger.warn(`[BFF] JWT verification failed: ${message}`);
            res.clearCookie('bff_jwt');
            return res.status(401).json({ error: `Unauthorized: ${message}` });
        }
    }

    if (hasLegacyCookie) return next();

    return res.status(401).json({ error: 'Authentication required' });
};
