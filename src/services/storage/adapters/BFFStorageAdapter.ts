import { IStorageAdapter, AccessRequest, Grant, StorageConfig } from '../IStorageAdapter';
import { apiClient } from '../../../lib/axios';

export const BFFStorageAdapter: IStorageAdapter = {
    name: 'BFF Storage',
    type: 'BFF',

    async load(_config: StorageConfig): Promise<AccessRequest[]> {
        try {
            const res = await apiClient.get('/api/storage/requests');
            return res.data;
        } catch (e) {
            console.error('[BFFStorageAdapter] Load error:', e);
            return [];
        }
    },

    async save(data: AccessRequest[], _config: StorageConfig): Promise<boolean> {
        try {
            const res = await apiClient.post('/api/storage/requests', data);
            return res.status >= 200 && res.status < 300;
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
    },

    async getApprovers(config: StorageConfig): Promise<Record<string, string[]>> {
        try {
            const res = await apiClient.get('/api/storage/approvers');
            const data = res.data;
            const identityType = config.identityType || 'MOCK';
            return data[identityType] || {};
        } catch (e: any) {
            if (e.response?.status === 404) return {};
            console.error('[BFFStorageAdapter] Load approvers error:', e);
            return {};
        }
    },

    async saveApprovers(approvers: Record<string, string[]>, config: StorageConfig): Promise<boolean> {
        try {
            // Fetch all current data to not overwrite other identity types
            let allData: Record<string, any> = {};
            const getRes = await apiClient.get('/api/storage/approvers').catch(() => null);
            if (getRes) {
                allData = getRes.data;
            }

            const identityType = config.identityType || 'MOCK';
            allData[identityType] = approvers;

            const res = await apiClient.post('/api/storage/approvers', allData);
            return res.status >= 200 && res.status < 300;
        } catch (e) {
            console.error('[BFFStorageAdapter] Save approvers error:', e);
            return false;
        }
    }
};
