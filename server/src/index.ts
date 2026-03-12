import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { env } from './config';
import { logger, initStorage } from './services/storageService';
import { apiHitCounter } from './services/metricsService';
import { clearOldRevocations } from './services/revocationService';

// Middleware
import { generalLimiter } from './middleware/rateLimit';
import { validateCsrf } from './middleware/csrf';

// Routes
import authRoutes from './routes/authRoutes';
import storageRoutes from './routes/storageRoutes';
import proxyRoutes from './routes/proxyRoutes';
import auditRoutes from './routes/auditRoutes';
import healthRoutes from './routes/healthRoutes';

const app = express();
const PORT = env.PORT;

app.use((req, res, next) => {
    console.log(`[BFF-DEBUG] Incoming request: ${req.method} ${req.url}`);
    next();
});

// Initialize Persistence
initStorage();

// Security Headers & Base Middleware
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// HTTP Logging with correlation IDs
app.use(pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-correlation-id'] || crypto.randomUUID()
}));

// Global Security Policies
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

// App-wide Rate Limiting
app.use(generalLimiter);

// Telemetry Logic
app.use((req, res, next) => {
    res.on('finish', () => {
        if (!['/health', '/metrics'].includes(req.path)) {
            const routePath = (req as any).route ? (req as any).route.path : req.path;
            apiHitCounter.labels({
                method: req.method,
                route: routePath,
                status_code: res.statusCode.toString()
            }).inc();
        }
    });
    next();
});

// Route Wiring
app.use('/', healthRoutes); // /health and /metrics
app.use('/api/auth', authRoutes);
app.use('/api/storage', validateCsrf, storageRoutes);
app.use('/api/audit', validateCsrf, auditRoutes);
app.use('/api', proxyRoutes); // Proxy endpoints like /api/uc, /api/scim

// Periodically clear old revocation JTI claims (every 24h)
setInterval(clearOldRevocations, 24 * 60 * 60 * 1000);

// Global Standardized Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, '[BFF] Unhandled error');
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_SERVER_ERROR'
    });
});

app.listen(PORT, () => {
    console.log(`[BFF] Unity Catalog ACS Server running on http://localhost:${PORT}`);
});

export default app;
