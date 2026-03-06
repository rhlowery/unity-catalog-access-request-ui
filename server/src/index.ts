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
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'wasm-unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://*.databricks.com https://*.azuredatabricks.net; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'; " +
        "upgrade-insecure-requests;"
    );
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
const AUDIT_FILE = path.join(STORAGE_DIR, 'audit.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Initialize files if not present
[REQUESTS_FILE, APPROVERS_FILE, AUDIT_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(file === APPROVERS_FILE ? {} : [], null, 2));
    }
});

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
        sameSite: 'lax',
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
// =====================================================================
app.post('/api/token', authLimiter, async (req: Request, res: Response) => {
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
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3600000
        });

        res.json({ status: 'success' });
    } catch (err) {
        const error = err as AxiosError;
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Token exchange failed' });
    }
});

// =====================================================================
// PROXY: Databricks APIs (SCIM, Unity Catalog, SQL)
// =====================================================================

/**
 * Proxy for SCIM APIs (Users, Groups, Service Principals)
 * Route: /api/scim/api/2.0/...
 */
app.all(/^\/api\/scim\/(.*)/, requireAuth, async (req: Request, res: Response) => {
    const scimHost = req.headers['x-scim-host'] as string;
    const token = resolveToken(req);
    if (!scimHost || !token) {
        return res.status(400).json({ error: 'Missing x-scim-host or token' });
    }

    const scimPath = (req.params as any)[0];
    try {
        const response = await axios({
            method: req.method,
            url: `https://${scimHost}/${scimPath}`,
            headers: { 'Authorization': token },
            params: req.query,
            data: req.body
        });
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        logger.error({ err, path: scimPath }, '[BFF] SCIM Proxy Error');
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'SCIM request failed' });
    }
});

/**
 * Direct Proxy for Unity Catalog REST APIs
 * Route: /api/uc/api/2.1/unity-catalog/...
 */
app.all(/^\/api\/uc\/(.*)/, requireAuth, async (req: Request, res: Response) => {
    const workspaceHost = req.headers['x-workspace-host'] as string;
    const token = resolveToken(req);
    if (!workspaceHost || !token) {
        return res.status(400).json({ error: 'Missing x-workspace-host or token' });
    }

    const ucPath = (req.params as any)[0];
    try {
        const response = await axios({
            method: req.method,
            url: `https://${workspaceHost}/${ucPath}`,
            headers: { 'Authorization': token },
            params: req.query,
            data: req.body
        });
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        logger.error({ err, path: ucPath }, '[BFF] UC Proxy Error');
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'UC request failed' });
    }
});

/**
 * Specialized SDK Helper Proxy with Pagination support
 * Route: /api/sdk/:target (catalogs, schemas, tables)
 */
app.get('/api/sdk/:target', requireAuth, async (req: Request, res: Response) => {
    const workspaceHost = req.headers['x-workspace-host'] as string;
    const token = resolveToken(req);
    const { target } = req.params;
    const { catalog_name, schema_name, max_results, page_token } = req.query;

    if (!workspaceHost || !token) {
        return res.status(400).json({ error: 'Missing x-workspace-host or token' });
    }

    // Map targets to UC API paths
    let url = `https://${workspaceHost}/api/2.1/unity-catalog/${target}`;
    const params: any = {
        max_results: max_results || 100,
        page_token
    };

    if (target === 'schemas') {
        params.catalog_name = catalog_name;
    } else if (target === 'tables') {
        params.catalog_name = catalog_name;
        params.schema_name = schema_name;
    }

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': token },
            params
        });
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        logger.error({ err, target }, '[BFF] SDK Fetch Error');
        res.status(error.response?.status || 500).json(error.response?.data || { error: `SDK ${target} fetch failed` });
    }
});

/**
 * Server-side search for UC objects
 * Route: /api/sdk/search
 */
app.get('/api/catalog/search', requireAuth, async (req: Request, res: Response) => {
    const workspaceHost = req.headers['x-workspace-host'] as string;
    const token = resolveToken(req);
    const query = req.query.query as string;

    if (!workspaceHost || !token || !query) {
        return res.status(400).json({ error: 'Missing host, token, or query' });
    }

    try {
        // Step 1: Search for tables across all catalogs using UC Search API (if supported)
        // or fall back to listing schemas/tables for the specific query.
        // For this implementation, we'll search across common catalogs.
        const response = await axios.get(`https://${workspaceHost}/api/2.1/unity-catalog/tables?max_results=1000`, {
            headers: { 'Authorization': token }
        });

        const allTables = response.data.tables || [];
        const filtered = allTables.filter((t: any) =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.catalog_name.toLowerCase().includes(query.toLowerCase()) ||
            t.schema_name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 100); // Limit results for performance

        res.json({ results: filtered });
    } catch (err) {
        const error = err as AxiosError;
        logger.error({ err }, '[BFF] Search Error');
        res.status(error.response?.status || 500).json({ error: 'Search failed' });
    }
});

// =====================================================================
// SQL EXECUTION
// =====================================================================
app.post('/api/sql/execute', requireAuth, async (req: Request, res: Response) => {
    const { host, warehouseId, statement } = req.body;
    const token = resolveToken(req);

    if (!host || !warehouseId || !statement || !token) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        const response = await axios.post(`https://${host}/api/2.0/sql/statements`, { warehouse_id: warehouseId, statement }, { headers: { Authorization: token } });
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'SQL execution failed' });
    }
});

// =====================================================================
// AUTH: BFF-Issued JWT Login
// =====================================================================
app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
    const validation = validateInput(loginSchema, req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error });

    const { userId, userName, email, groups, role, provider, accessToken } = validation.data!;
    const payload: JwtPayload = { sub: userId, name: userName, email: email || `${userId}@local`, groups: groups || [], role: role || 'STANDARD_USER', provider, jti: crypto.randomUUID() };

    const token = jwt.sign(payload, env.effectiveJwtSecret, { expiresIn: env.JWT_EXPIRY as any, issuer: 'unity-catalog-acs-bff', audience: 'unity-catalog-acs-ui' });

    if (accessToken) {
        res.cookie('access_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
    }
    res.cookie('bff_jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });

    const decoded = jwt.decode(token) as any;
    res.json({ status: 'success', token, expiresAt: decoded.exp * 1000, user: payload });
});

app.post('/api/auth/refresh', authLimiter, (req: Request, res: Response) => {
    const existingJwt = req.cookies['bff_jwt'] || (req.headers['authorization'] as string)?.replace('Bearer ', '');
    if (!existingJwt) return res.status(401).json({ error: 'No JWT provided' });

    try {
        const decoded = jwt.verify(existingJwt, env.effectiveJwtSecret, { issuer: 'unity-catalog-acs-bff', audience: 'unity-catalog-acs-ui' }) as JwtPayload;
        if (decoded.jti && revokedTokens.has(decoded.jti)) return res.status(401).json({ error: 'Token revoked' });

        if (decoded.jti) revokedTokens.add(decoded.jti);
        const { sub, name, email, groups, role, provider } = decoded;
        const newToken = jwt.sign({ sub, name, email, groups, role, provider, jti: crypto.randomUUID() }, env.effectiveJwtSecret, { expiresIn: env.JWT_EXPIRY as any, issuer: 'unity-catalog-acs-bff', audience: 'unity-catalog-acs-ui' });

        res.cookie('bff_jwt', newToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
        const decodedNew = jwt.decode(newToken) as any;
        res.json({ status: 'success', token: newToken, expiresAt: decodedNew.exp * 1000 });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.post('/api/auth/logout', authLimiter, (req: Request, res: Response) => {
    const existingJwt = req.cookies['bff_jwt'];
    if (existingJwt) {
        try {
            const decoded = jwt.decode(existingJwt) as JwtPayload;
            if (decoded?.jti) revokedTokens.add(decoded.jti);
        } catch (e) { }
    }
    res.clearCookie('bff_jwt');
    res.clearCookie('access_token');
    res.json({ status: 'success' });
});

app.get('/api/session/validate', requireAuth, (_req: Request, res: Response) => res.json({ valid: true }));

// =====================================================================
// STORAGE BROKER
// =====================================================================
app.get('/api/storage/requests', requireAuth, (req: Request, res: Response) => {
    try {
        const data = fs.readFileSync(REQUESTS_FILE, 'utf8');
        const allRequests: any[] = JSON.parse(data);
        const userId = (req as any).userId;
        const userGroups = (req as any).userGroups;
        const isAdmin = userGroups.includes('admins') || userGroups.includes('admin');

        const filteredRequests = isAdmin ? allRequests : allRequests.filter((r: any) => r.requesterId === userId || r.userId === userId || r.approverGroups?.some((g: string) => userGroups.includes(g)));
        res.json(filteredRequests);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read requests' });
    }
});

app.post('/api/storage/requests', requireAuth, (req: Request, res: Response) => {
    try {
        const validation = validateInput(storageRequestSchema, req.body);
        if (!validation.success) return res.status(400).json({ error: validation.error });
        fs.writeFileSync(REQUESTS_FILE, JSON.stringify(validation.data, null, 2));
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save requests' });
    }
});

app.get('/api/storage/approvers', requireAuth, (req: Request, res: Response) => {
    try {
        const data = fs.readFileSync(APPROVERS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read approvers' });
    }
});

app.post('/api/storage/approvers', requireAuth, (req: Request, res: Response) => {
    try {
        const userGroups = (req as any).userGroups || [];
        const isAdmin = userGroups.includes('admins') || userGroups.includes('admin');
        if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
        fs.writeFileSync(APPROVERS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save approvers' });
    }
});

// =====================================================================
// AUDIT LOGGING
// =====================================================================
app.post('/api/audit/log', requireAuth, (req: Request, res: Response) => {
    try {
        const entry = req.body;
        if (!entry || !entry.type || !entry.actor) {
            return res.status(400).json({ error: 'Invalid audit entry' });
        }

        const data = fs.readFileSync(AUDIT_FILE, 'utf8');
        const auditLogs = JSON.parse(data);

        // Add entry to the beginning (most recent first)
        auditLogs.unshift({
            ...entry,
            serverTimestamp: Date.now()
        });

        // Limit to last 5000 entries
        const limitedLogs = auditLogs.slice(0, 5000);

        fs.writeFileSync(AUDIT_FILE, JSON.stringify(limitedLogs, null, 2));
        res.json({ status: 'success' });
    } catch (err) {
        logger.error({ err }, '[BFF] Audit Log Write Error');
        res.status(500).json({ error: 'Failed to save audit log' });
    }
});

app.get('/api/audit/log', requireAuth, (req: Request, res: Response) => {
    try {
        const data = fs.readFileSync(AUDIT_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        logger.error({ err }, '[BFF] Audit Log Read Error');
        res.status(500).json({ error: 'Failed to read audit logs' });
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
