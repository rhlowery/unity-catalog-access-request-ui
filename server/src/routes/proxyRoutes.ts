import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { requireAuth, resolveToken } from '../middleware/auth';
import { logger } from '../services/storageService';

const router = Router();

router.all(/^\/scim\/(.*)/, requireAuth, async (req: Request, res: Response) => {
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

router.all(/^\/uc\/(.*)/, requireAuth, async (req: Request, res: Response) => {
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

router.get('/sdk/:target', requireAuth, async (req: Request, res: Response) => {
    const workspaceHost = req.headers['x-workspace-host'] as string;
    const token = resolveToken(req);
    const { target } = req.params;
    const { catalog_name, schema_name, max_results, page_token } = req.query;

    if (!workspaceHost || !token) {
        return res.status(400).json({ error: 'Missing x-workspace-host or token' });
    }

    let url = `https://${workspaceHost}/api/2.1/unity-catalog/${target}`;
    const params: any = {
        max_results: max_results || 100,
        page_token
    };

    if (target === 'schemas') params.catalog_name = catalog_name;
    else if (target === 'tables') {
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

router.get('/catalog/search', requireAuth, async (req: Request, res: Response) => {
    const workspaceHost = req.headers['x-workspace-host'] as string;
    const token = resolveToken(req);
    const query = req.query.query as string;

    if (!workspaceHost || !token || !query) {
        return res.status(400).json({ error: 'Missing host, token, or query' });
    }

    try {
        const response = await axios.get(`https://${workspaceHost}/api/2.1/unity-catalog/tables?max_results=1000`, {
            headers: { 'Authorization': token }
        });

        const allTables = response.data.tables || [];
        const filtered = allTables.filter((t: any) =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.catalog_name.toLowerCase().includes(query.toLowerCase()) ||
            t.schema_name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 100);

        res.json({ results: filtered });
    } catch (err) {
        const error = err as AxiosError;
        logger.error({ err }, '[BFF] Search Error');
        res.status(error.response?.status || 500).json({ error: 'Search failed' });
    }
});

router.post('/sql/execute', requireAuth, async (req: Request, res: Response) => {
    const { host, warehouseId, statement } = req.body;
    const token = resolveToken(req);

    if (!host || !warehouseId || !statement || !token) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        const response = await axios.post(`https://${host}/api/2.0/sql/statements`,
            { warehouse_id: warehouseId, statement },
            { headers: { Authorization: token } }
        );
        res.json(response.data);
    } catch (err) {
        const error = err as AxiosError;
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'SQL execution failed' });
    }
});

export default router;
