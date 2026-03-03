import { IStorageAdapter, AccessRequest, Grant, StorageConfig } from '../IStorageAdapter';

const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';

export const BFFStorageAdapter: IStorageAdapter = {
    name: 'BFF Storage',
    type: 'BFF',

    async load(_config: StorageConfig): Promise<AccessRequest[]> {
        try {
            const res = await fetch(`${BFF_URL}/api/storage/requests`);
            if (!res.ok) throw new Error('Failed to load requests from BFF');
            return await res.json();
        } catch (e) {
            console.error('[BFFStorageAdapter] Load error:', e);
            return [];
        }
    },

    async save(data: AccessRequest[], _config: StorageConfig): Promise<boolean> {
        try {
            const res = await fetch(`${BFF_URL}/api/storage/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.ok;
        } catch (e) {
            console.error('[BFFStorageAdapter] Save error:', e);
            return false;
        }
    },

    async upsertRequest(request: AccessRequest, config: StorageConfig): Promise<boolean> {
        const requests = await this.load(config);
        const index = requests.findIndex(r => r.id === request.id);

        if (index !== -1) {
            requests[index] = request;
        } else {
            requests.push(request);
        }

        return await this.save(requests, config);
    },

    async getGrants(object: any, config: StorageConfig): Promise<Grant[]> {
        const requests = await this.load(config);

        // Filter for approved requests that match the object
        const approved = requests.filter(r => r.status === 'APPROVED');

        const grants: Grant[] = [];
        approved.forEach(req => {
            // Check if this request covers the object
            const matches = req.objects?.some((obj: any) =>
                obj.id === object.id ||
                (object.type === 'SCHEMA' && obj.catalog === object.catalog && obj.schema === object.schema) ||
                (object.type === 'CATALOG' && obj.catalog === object.catalog)
            );

            if (matches) {
                grants.push({
                    id: `grant-${req.id}`,
                    principal: req.principal,
                    permissions: req.permissions || [],
                    request: req
                } as any);
            }
        });

        return grants;
    }
};
