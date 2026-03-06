import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './config';

// =====================================================================
// INPUT VALIDATION SCHEMAS
// =====================================================================
const loginSchema = z.object({
    userId: z.string().min(1).max(100),
    userName: z.string().min(1).max(100),
    email: z.string().email().optional(),
    groups: z.array(z.string()).optional(),
    role: z.string().max(50).optional(),
    provider: z.string().min(1).max(50),
    accessToken: z.string().optional()
});

const tokenExchangeSchema = z.object({
    host: z.string().optional()
});

const storageRequestSchema = z.array(z.object({
    id: z.string().optional(),
    objects: z.array(z.any()).optional(),
    principals: z.array(z.any()).optional(),
    permissions: z.array(z.string()).optional(),
    justification: z.string().optional(),
    requesterId: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional()
}).passthrough());

const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } => {
    const result = schema.safeParse(data);
    if (!result.success) {
        const issues = result.error.issues;
        const errors = issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        return { success: false, error: errors };
    }
    return { success: true, data: result.data };
};

// =====================================================================
// LOGGER & REVOCATION SETUP
// =====================================================================
export const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

// Explicit token blocklist for revoked JTI claims before expiration
const revokedTokens = new Set<string>();

// Periodic cleanup of revoked tokens (prevents memory leak over long periods)
setInterval(() => revokedTokens.clear(), 24 * 60 * 60 * 1000);

/** Payload embedded inside every BFF-issued JWT. */
interface JwtPayload {
    sub: string;       // userId
    name: string;
    email: string;
    groups: string[];
    role: string;
    provider: string;  // MOCK | OAUTH | SAML | DATABRICKS
    jti?: string;      // Optional for backwards compat during migration, but required for new tokens
}

// =====================================================================
// CSRF TOKEN GENERATION
// =====================================================================
const generateCsrfToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

const app = express();
const PORT = env.PORT;

app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Pino HTTP request logging middleware matching frontend correlation ID
app.use(pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-correlation-id'] || crypto.randomUUID()
}));

app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';");
    next();
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use(generalLimiter);

// =====================================================================
// STORAGE: File-based persistence
// =====================================================================
const STORAGE_DIR = path.join(process.cwd(), 'data');
const REQUESTS_FILE = path.join(STORAGE_DIR, 'requests.json');
const APPROVERS_FILE = path.join(STORAGE_DIR, 'approvers.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Initialize requests file if not present
if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([], null, 2));
}

// Initialize approvers file if not present
if (!fs.existsSync(APPROVERS_FILE)) {
    fs.writeFileSync(APPROVERS_FILE, JSON.stringify({}, null, 2));
}

// Health check
app.get('/health', (_req: Request, res: Response) => {
    const checks = {
        storage: fs.existsSync(STORAGE_DIR) ? 'ok' : 'error',
        jwtConfigured: !!env.effectiveJwtSecret ? 'ok' : 'warning',
        env: env.NODE_ENV
    };
    const allOk = Object.values(checks).every(v => v !== 'error');
    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ok' : 'degraded',
        version: '1.0.0',
        checks
    });
});

// =====================================================================
// CSRF Protection
// =====================================================================
app.get('/api/auth/csrf', (_req: Request, res: Response) => {
    const csrfToken = generateCsrfToken();
    res.cookie('csrf_token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000
    });
    res.json({ csrfToken });
});

const csrfLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
// =====================================================================
// SECURITY: Helper and Middleware
// =====================================================================

/**
 * Helper: Resolves the authorization token from the cookie or Authorization header.
 * Returns null if no token is found.
 */
const resolveToken = (req: Request): string | null => {
    if (req.headers['authorization']) return req.headers['authorization'] as string;
    if (req.cookies['access_token']) return `Bearer ${req.cookies['access_token']}`;
    return null;
};

/**
 * Verifies the BFF-issued JWT on all protected routes.
 * Extracts userId and userGroups from JWT claims for downstream authz.
 */
const requireAuth = (req: Request, res: Response, next: any) => {
    // 1. Try the BFF-issued JWT (preferred)
    let bffJwt = req.cookies['bff_jwt'];

    // 2. Fall back to Authorization header (e.g., API clients)
    if (!bffJwt) {
        const authHeader = req.headers['authorization'] as string;
        if (authHeader?.startsWith('Bearer ')) {
            bffJwt = authHeader.slice(7);
        }
    }

    // 3. Fall back to legacy access_token cookie (Databricks OAuth flow)
    const hasLegacyCookie = !!req.cookies['access_token'];

    if (!bffJwt && !hasLegacyCookie) {
        return res.status(401).json({ error: 'Unauthorized: No valid session token found' });
    }

    if (bffJwt) {
        try {
            const decoded = jwt.verify(bffJwt, env.effectiveJwtSecret, {
                issuer: 'unity-catalog-acs-bff',
                audience: 'unity-catalog-acs-ui',
            }) as JwtPayload;

            if (decoded.jti && revokedTokens.has(decoded.jti)) {
                throw new Error('Token has been revoked');
            }

            // Attach verified identity to the request for downstream use
            (req as any).userId = decoded.sub;
            (req as any).userGroups = decoded.groups || [];
            (req as any).userRole = decoded.role;
            (req as any).jwtPayload = decoded;

            return next();
        } catch (err) {
            const message = (err as Error).message;
            logger.warn(`[BFF] JWT verification failed: ${message}`);
            res.clearCookie('bff_jwt');
            return res.status(401).json({ error: `Unauthorized: ${message}` });
        }
    }

    // If we only have the legacy cookie but no BFF JWT yet, we still let them through
    // for endpoints that handle token exchange or basic identity.
    if (hasLegacyCookie) return next();

    return res.status(401).json({ error: 'Authentication required' });
};

// CSRF validation middleware for state-changing operations
const validateCsrf = (req: Request, res: Response, next: () => void): void => {
    const csrfToken = req.headers['x-csrf-token'] as string;
    const cookieToken = req.cookies['csrf_token'];

    // Skip CSRF for GET requests (read-only)
    if (req.method === 'GET') {
        return next();
    }

    // Validate CSRF token - always enforce in production, configurable in dev
    const csrfEnabled = process.env.CSRF_ENABLED !== 'false';

    if (!csrfToken || !cookieToken) {
        console.warn('[BFF] CSRF validation failed: missing token');
        if (csrfEnabled) {
            res.status(403).json({ error: 'CSRF validation failed' });
            return;
        }
    } else if (csrfEnabled && csrfToken !== cookieToken) {
        console.warn('[BFF] CSRF validation failed: token mismatch');
        res.status(403).json({ error: 'CSRF validation failed' });
        return;
    }

    next();
};

// =====================================================================
// SECURITY: OAuth2 Token Exchange (Client Credentials)
// This endpoint keeps the client_secret server-side, never exposing it
// to the browser.
// =====================================================================
app.post('/api/token', authLimiter, async (req: Request, res: Response) => {
    // Priority: 1. Request Body (runtime config), 2. Environment Variables
    const clientId = req.body.clientId || process.env.DATABRICKS_CLIENT_ID;
    const clientSecret = req.body.clientSecret || process.env.DATABRICKS_CLIENT_SECRET;
    const host = req.body.host || process.env.DATABRICKS_HOST;

    if (!clientId || !clientSecret || !host) {
        console.error('[BFF] Token Error: Missing credentials');
        return res.status(400).json({ error: 'DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET, and host are required (via env or body)' });
    }

    try {
        console.log(`[BFF] Exchanging credentials for host: ${host}`);
        const body = new URLSearchParams();
        body.append('grant_type', 'client_credentials');
        body.append('scope', 'all-apis');

        const response = await axios.post(
            `https://${host}/oidc/v1/token`,
            body.toString(),
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const token = response.data.access_token;

        // Set HttpOnly cookie
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        res.json({ status: 'success', message: 'Token exchanged and stored in cookie' });
    } catch (err) {
        const error = err as AxiosError;
        console.error('[BFF] Token Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Token exchange failed' });
    }
});

// =====================================================================
// SQL EXECUTION: For Unity Catalog Storage Backend
// Proxies SQL commands to Databricks SQL Warehouse.
// =====================================================================
app.post('/api/sql/execute', requireAuth, async (req: Request, res: Response) => {
    const { host, warehouseId, statement } = req.body;
    const token = resolveToken(req);

    if (!host || !warehouseId || !statement || !token) {
        return res.status(400).json({ error: 'Missing host, warehouseId, statement, or auth token' });
    }

    try {
        console.log(`[BFF] Executing SQL on warehouse ${warehouseId}...`);
        const response = await axios.post(
            `https://${host}/api/2.0/sql/statements`,
            { warehouse_id: warehouseId, statement },
            { headers: { Authorization: token } }
        );

        // If the query is still running, the API might return a statement ID.
        // For simplicity in this POC, we wait. In production, we'd poll or use long-polling.
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        console.error('[BFF] SQL Execution Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'SQL execution failed' });
    }
});

// =====================================================================
// AUTH: BFF-Issued JWT Login
// Issues a signed JWT for any identity provider (mock or real).
// For real providers (OAuth/SAML/Databricks), the upstream token is kept
// server-side in an HttpOnly cookie; the JWT only carries identity claims.
// =====================================================================

/**
 * POST /api/auth/login
 * Body: { userId, userName, email, groups, role, provider, accessToken? }
 *
 * Signs and returns a short-lived JWT. The token is set in a HttpOnly
 * `bff_jwt` cookie AND returned in the body so the frontend can read
 * the `expiresAt` timestamp for session management.
 */
app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
    const validation = validateInput(loginSchema, req.body);
    if (!validation.success) {
        return res.status(400).json({ error: `Invalid input: ${validation.error}` });
    }

    const { userId, userName, email, groups, role, provider, accessToken } = validation.data!;

    const payload: JwtPayload = {
        sub: userId,
        name: userName,
        email: email || `${userId}@local`,
        groups: Array.isArray(groups) ? groups : [],
        role: role || 'STANDARD_USER',
        provider,
        jti: crypto.randomUUID(),
    };

    const token = jwt.sign(payload, env.effectiveJwtSecret, {
        expiresIn: env.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
        issuer: 'unity-catalog-acs-bff',
        audience: 'unity-catalog-acs-ui',
    });

    // Optional: store an upstream OAuth/Databricks access token server-side
    if (accessToken) {
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000,
        });
    }

    // BFF-issued JWT in its own HttpOnly cookie
    res.cookie('bff_jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000,
    });

    const decoded = jwt.decode(token) as { exp: number };
    console.log(`[BFF] Issued JWT for ${userId} (${provider}) exp=${new Date(decoded.exp * 1000).toISOString()}`);

    res.json({
        status: 'success',
        token,
        expiresAt: decoded.exp * 1000,
        user: payload,
    });
});

/**
 * POST /api/auth/refresh
 * Re-issues a fresh JWT if the current one is still valid.
 */
app.post('/api/auth/refresh', authLimiter, (req: Request, res: Response) => {
    const existingJwt =
        req.cookies['bff_jwt'] ||
        (req.headers['authorization'] as string)?.replace('Bearer ', '');

    if (!existingJwt) {
        return res.status(401).json({ error: 'No JWT provided' });
    }

    try {
        const decoded = jwt.verify(existingJwt, env.effectiveJwtSecret, {
            issuer: 'unity-catalog-acs-bff',
            audience: 'unity-catalog-acs-ui',
        }) as JwtPayload;

        if (decoded.jti && revokedTokens.has(decoded.jti)) {
            res.clearCookie('bff_jwt');
            return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
        }

        if (decoded.jti) {
            revokedTokens.add(decoded.jti);
        }

        const { sub, name, email, groups, role, provider } = decoded;
        const newToken = jwt.sign(
            { sub, name, email, groups, role, provider, jti: crypto.randomUUID() },
            env.effectiveJwtSecret,
            {
                expiresIn: env.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
                issuer: 'unity-catalog-acs-bff',
                audience: 'unity-catalog-acs-ui',
            }
        );

        res.cookie('bff_jwt', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000,
        });

        const decodedNew = jwt.decode(newToken) as { exp: number };
        console.log(`[BFF] Refreshed JWT for ${sub}`);
        res.json({ status: 'success', token: newToken, expiresAt: decodedNew.exp * 1000 });
    } catch (err) {
        console.warn('[BFF] JWT refresh failed:', (err as Error).message);
        res.clearCookie('bff_jwt');
        res.status(401).json({ error: 'Invalid or expired JWT. Please log in again.' });
    }
});

/**
 * POST /api/auth/logout
 * Clears all authentication cookies.
 */
app.post('/api/auth/logout', authLimiter, (req: Request, res: Response) => {
    const existingJwt = req.cookies['bff_jwt'];
    if (existingJwt) {
        try {
            const decoded = jwt.decode(existingJwt) as JwtPayload;
            if (decoded?.jti) {
                revokedTokens.add(decoded.jti);
            }
        } catch (e) {
            // ignore malformed tokens on logout
        }
    }

    res.clearCookie('bff_jwt');
    res.clearCookie('access_token');
    logger.info('[BFF] User logged out, auth cookies cleared');
    res.json({ status: 'success' });
});


app.get('/api/session/validate', requireAuth, (_req: Request, res: Response) => {
    res.json({ valid: true });
});

// =====================================================================
// SERVER-SENT EVENTS (SSE)
// =====================================================================
const sseClients = new Set<Response>();

const notifyClients = () => {
    const payload = `data: ${JSON.stringify({ type: 'UPDATE' })}\n\n`;
    for (const client of sseClients) {
        client.write(payload);
    }
};

app.get('/api/storage/requests/stream', requireAuth, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    req.on('close', () => {
        sseClients.delete(res);
    });
});

// =====================================================================
// STORAGE BROKER: Server-side persistence for Access Requests
// =====================================================================
app.get('/api/storage/requests', requireAuth, (req: Request, res: Response) => {
    try {
        const data = fs.readFileSync(REQUESTS_FILE, 'utf8');
        const allRequests: any[] = JSON.parse(data);

        const userId = (req as any).userId as string;
        const userGroups: string[] = (req as any).userGroups;
        const isAdmin = userGroups.includes('admins') || userGroups.includes('admin');

        // Admins see ALL requests (needed for the Approver Dashboard)
        // Non-admins see only their own requests OR requests relevant to their groups
        const filteredRequests = isAdmin
            ? allRequests
            : allRequests.filter((r: any) => {
                // Is this user the original requester?
                const isOwner = r.requesterId === userId || r.userId === userId;
                // Does the request target a catalog/schema associated with one of their groups?
                const isGroupRelevant = r.approverGroups?.some((g: string) => userGroups.includes(g));
                return isOwner || isGroupRelevant;
            });

        console.log(`[BFF] GET /api/storage/requests: user=${userId}, groups=[${userGroups}], returning ${filteredRequests.length}/${allRequests.length} requests`);
        res.json(filteredRequests);
    } catch (err) {
        console.error('[BFF] Storage Read Error:', err);
        res.status(500).json({ error: 'Failed to read requests from storage' });
    }
});

app.post('/api/storage/requests', requireAuth, (req: Request, res: Response) => {
    try {
        const validation = validateInput(storageRequestSchema, req.body);
        if (!validation.success) {
            return res.status(400).json({ error: `Invalid input: ${validation.error}` });
        }

        const requests = validation.data!;
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
        notifyClients();
        res.json({ status: 'success', count: requests.length });
    } catch (err) {
        logger.error({ err }, '[BFF] Storage Write Error');
        res.status(500).json({ error: 'Failed to save requests to storage' });
    }
});

app.get('/api/storage/approvers', requireAuth, (req: Request, res: Response) => {
    try {
        const data = fs.readFileSync(APPROVERS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('[BFF] Approvers Read Error:', err);
        res.status(500).json({ error: 'Failed to read approvers from storage' });
    }
});

app.post('/api/storage/approvers', requireAuth, (req: Request, res: Response) => {
    try {
        // Only admins can save approvers globally
        const userGroups: string[] = (req as any).userGroups || [];
        const isAdmin = userGroups.includes('admins') || userGroups.includes('admin') || userGroups.includes('group_security');

        if (!isAdmin) {
            return res.status(403).json({ error: 'Insufficient permissions to update approvers' });
        }

        const approvers = req.body;
        // Basic validation that it's an object mapping strings to string arrays
        if (typeof approvers !== 'object' || Array.isArray(approvers)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        fs.writeFileSync(APPROVERS_FILE, JSON.stringify(approvers, null, 2));
        res.json({ status: 'success' });
    } catch (err) {
        logger.error({ err }, '[BFF] Approvers Write Error');
        res.status(500).json({ error: 'Failed to save approvers to storage' });
    }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: any) => {
    console.error('[BFF] Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`[BFF] Server running on http://localhost:${PORT}`);
});

export default app;
