import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import axios, { AxiosError } from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// =====================================================================
// SECURITY: OAuth2 Token Exchange (Client Credentials)
// This endpoint keeps the client_secret server-side, never exposing it
// to the browser.
// =====================================================================
app.post('/api/token', async (req: Request, res: Response) => {
    const { clientId, clientSecret, host } = req.body;

    if (!clientId || !clientSecret || !host) {
        return res.status(400).json({ error: 'clientId, clientSecret, and host are required' });
    }

    try {
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
        res.json({ access_token: response.data.access_token });
    } catch (err) {
        const error = err as AxiosError;
        console.error('[BFF] Token Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Token exchange failed' });
    }
});

// =====================================================================
// PROXY: Unity Catalog REST API
// Forwards /api/uc/* to <workspace>/api/2.1/unity-catalog/*
// The frontend sends x-workspace-host to specify the target workspace.
// =====================================================================
app.all('/api/uc/*splat', async (req: Request, res: Response) => {
    const workspaceHost = req.headers['x-workspace-host'] as string;
    const token = req.headers['authorization'];

    if (!workspaceHost || !token) {
        return res.status(400).json({ error: 'Missing x-workspace-host or Authorization header' });
    }

    // Strip the /api/uc prefix and append to the UC REST path
    const ucPath = req.path.replace(/^\/api\/uc/, '');
    const ucUrl = `https://${workspaceHost}/api/2.1/unity-catalog${ucPath}`;

    try {
        const response = await axios({
            method: req.method,
            url: ucUrl,
            data: req.method !== 'GET' ? req.body : undefined,
            params: req.query,
            headers: { 'Authorization': token, 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        console.error(`[BFF] UC Proxy Error (${ucPath}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'UC API call failed' });
    }
});

// =====================================================================
// PROXY: SCIM API (Users, Groups, Service Principals)
// Forwards /api/scim/* to <host>/api/2.0/...
// =====================================================================
app.all('/api/scim/*splat', async (req: Request, res: Response) => {
    const scimHost = req.headers['x-scim-host'] as string;
    const token = req.headers['authorization'];

    if (!scimHost || !token) {
        return res.status(400).json({ error: 'Missing x-scim-host or Authorization header' });
    }

    const scimPath = req.path.replace(/^\/api\/scim/, '');
    const scimUrl = `https://${scimHost}${scimPath}`;

    try {
        const response = await axios({
            method: req.method,
            url: scimUrl,
            data: req.method !== 'GET' ? req.body : undefined,
            params: req.query,
            headers: { 'Authorization': token, 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        console.error(`[BFF] SCIM Proxy Error (${scimPath}):`, error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'SCIM API call failed' });
    }
});

// =====================================================================
// STORAGE BROKER: Placeholder for future server-side storage ops
// This will eventually broker RDBMS and Unity Catalog storage ops
// =====================================================================
app.use('/api/storage', (_req: Request, res: Response) => {
    res.status(501).json({ message: 'Server-side Storage Broker not yet implemented' });
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
