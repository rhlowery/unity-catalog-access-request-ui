import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateInput, storageRequestSchema } from '../utils/validation';
import { readRequests, writeRequests, readApprovers, writeApprovers, logger } from '../services/storageService';

const router = Router();

let sseClients: Response[] = [];

router.get('/requests/stream', requireAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write('data: {"type": "CONNECTED"}\n\n');
    sseClients.push(res);

    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
    });
});

const notifyClients = () => {
    sseClients.forEach(client => {
        client.write('data: {"type": "UPDATE"}\n\n');
    });
};

router.get('/requests', requireAuth, (req, res) => {
    const allRequests = readRequests();
    const userId = (req as any).userId;
    const userGroups = (req as any).userGroups;
    const isAdmin = userGroups.includes('admins') || userGroups.includes('admin');

    const filteredRequests = isAdmin ? allRequests : allRequests.filter((r: any) =>
        r.requesterId === userId ||
        r.userId === userId ||
        r.approverGroups?.some((g: string) => userGroups.includes(g))
    );
    res.json(filteredRequests);
});

router.post('/requests', requireAuth, (req, res) => {
    const validation = validateInput(storageRequestSchema, req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error });

    const incomingRequests = validation.data!;
    const userId = (req as any).userId;
    const userGroups = (req as any).userGroups;
    const isAdmin = userGroups.includes('admins') || userGroups.includes('admin');

    const existingRequests = readRequests();
    const existingMap = new Map(existingRequests.map(r => [r.id, r]));

    for (const storageReq of incomingRequests) {
        const existing = existingMap.get(storageReq.id);

        if (!existing) {
            storageReq.requesterId = userId;
            storageReq.status = 'PENDING';
            storageReq.createdAt = storageReq.createdAt || Date.now();
            existingMap.set(storageReq.id, storageReq);
        } else {
            const isOwner = existing.requesterId === userId || existing.userId === userId;

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: `Forbidden: You do not have permission to update request ${storageReq.id}` });
            }

            if (!isAdmin) {
                storageReq.status = existing.status;
                storageReq.requesterId = existing.requesterId;
            }

            existingMap.set(storageReq.id, { ...existing, ...storageReq, updatedAt: Date.now() });
        }
    }

    writeRequests(Array.from(existingMap.values()));
    notifyClients();

    res.json({ status: 'success', count: incomingRequests.length });
});

router.get('/approvers', requireAuth, (req, res) => {
    res.json(readApprovers());
});

router.post('/approvers', requireAuth, (req, res) => {
    const userGroups = (req as any).userGroups || [];
    const isAdmin = userGroups.includes('admins') || userGroups.includes('admin');
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    writeApprovers(req.body);
    res.json({ status: 'success' });
});

export default router;
