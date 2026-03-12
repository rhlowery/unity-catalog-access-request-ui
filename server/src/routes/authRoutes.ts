import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { env } from '../config';
import { revokeToken, isTokenRevoked } from '../services/revocationService';
import { authLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { generateCsrfToken } from '../middleware/csrf';
import { validateInput, loginSchema } from '../utils/validation';
import { JwtPayload } from '../types';

const router = Router();

router.get('/csrf', (req, res) => {
    const csrfToken = generateCsrfToken();
    res.cookie('csrf_token', csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600000
    });
    res.json({ csrfToken });
});

router.post('/login', authLimiter, (req, res) => {
    const validation = validateInput(loginSchema, req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error });

    const { userId, userName, email, groups, role, provider, accessToken } = validation.data!;

    // Assign granular permissions based on role
    const permissions = role === 'ADMIN'
        ? ['can_request', 'can_approve', 'can_audit', 'can_configure', 'can_manage_users']
        : ['can_request'];

    const payload: JwtPayload = {
        sub: userId,
        name: userName,
        email: email || `${userId}@local`,
        groups: groups || [],
        role: role || 'STANDARD_USER',
        permissions,
        provider,
        jti: crypto.randomUUID()
    };

    const token = jwt.sign(payload, env.effectiveJwtSecret, {
        expiresIn: env.JWT_EXPIRY as any,
        issuer: 'unity-catalog-acs-bff',
        audience: 'unity-catalog-acs-ui'
    });

    if (accessToken) {
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000
        });
    }
    res.cookie('bff_jwt', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000
    });

    const csrfToken = generateCsrfToken();
    res.cookie('csrf_token', csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600000
    });

    const decoded = jwt.decode(token) as any;
    res.json({ status: 'success', expiresAt: decoded.exp * 1000, user: payload, csrfToken });
});

router.post('/refresh', authLimiter, (req, res) => {
    const existingJwt = req.cookies['bff_jwt'] || (req.headers['authorization'] as string)?.replace('Bearer ', '');
    if (!existingJwt) return res.status(401).json({ error: 'No JWT provided' });

    try {
        const decoded = jwt.verify(existingJwt, env.effectiveJwtSecret, {
            issuer: 'unity-catalog-acs-bff',
            audience: 'unity-catalog-acs-ui'
        }) as JwtPayload;

        if (decoded.jti && isTokenRevoked(decoded.jti)) {
            return res.status(401).json({ error: 'Token revoked' });
        }

        if (decoded.jti) revokeToken(decoded.jti);

        const { sub, name, email, groups, role, permissions, provider } = decoded;
        const newToken = jwt.sign({
            sub, name, email, groups, role, permissions, provider,
            jti: crypto.randomUUID()
        }, env.effectiveJwtSecret, {
            expiresIn: env.JWT_EXPIRY as any,
            issuer: 'unity-catalog-acs-bff',
            audience: 'unity-catalog-acs-ui'
        });

        res.cookie('bff_jwt', newToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60 * 1000
        });

        const decodedNew = jwt.decode(newToken) as any;
        const csrfToken = generateCsrfToken();
        res.cookie('csrf_token', csrfToken, {
            httpOnly: false,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600000
        });
        res.json({ status: 'success', expiresAt: decodedNew.exp * 1000, csrfToken });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.post('/logout', authLimiter, (req, res) => {
    const existingJwt = req.cookies['bff_jwt'];
    if (existingJwt) {
        try {
            const decoded = jwt.decode(existingJwt) as JwtPayload;
            if (decoded?.jti) revokeToken(decoded.jti);
        } catch (e) { }
    }
    res.clearCookie('bff_jwt');
    res.clearCookie('access_token');
    res.json({ status: 'success' });
});

router.get('/me', requireAuth, (req, res) => {
    const jwtPayload = (req as any).jwtPayload;

    if (!jwtPayload) {
        return res.status(401).json({ error: 'No active session' });
    }

    const user = {
        id: jwtPayload.sub,
        name: jwtPayload.name,
        email: jwtPayload.email,
        groups: jwtPayload.groups,
        role: jwtPayload.role,
        provider: jwtPayload.provider
    };

    const csrfToken = generateCsrfToken();
    res.cookie('csrf_token', csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600000
    });

    res.json({ user, csrfToken });
});

router.post('/token', authLimiter, async (req, res) => {
    const clientId = req.body.clientId || process.env.DATABRICKS_CLIENT_ID;
    const clientSecret = req.body.clientSecret || process.env.DATABRICKS_CLIENT_SECRET;
    const host = req.body.host || process.env.DATABRICKS_HOST;

    if (!clientId || !clientSecret || !host) {
        return res.status(400).json({ error: 'DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET, and host are required' });
    }

    try {
        const body = new URLSearchParams();
        body.append('grant_type', 'client_credentials');
        body.append('scope', 'all-apis');

        const response = await axios.post(`https://${host}/oidc/v1/token`, body.toString(), {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.cookie('access_token', response.data.access_token, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600000
        });

        res.json({ status: 'success' });
    } catch (err) {
        const error = err as AxiosError;
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Token exchange failed' });
    }
});

export default router;
