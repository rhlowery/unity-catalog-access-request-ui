/**
 * Default Local Storage Adapter
 * Persists data in browser's localStorage.
 */
import { IStorageAdapter, StorageConfig, AccessRequest, Grant } from '../IStorageAdapter';

const STORAGE_KEY = 'uc_access_requests_v1';

export const LocalStorageAdapter: IStorageAdapter = {
    name: 'Local Storage',
    type: 'LOCAL',

    async load(config: StorageConfig): Promise<AccessRequest[]> {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    async save(data: AccessRequest[], config: StorageConfig): Promise<boolean> {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    },

    async upsertRequest(request: AccessRequest, config: StorageConfig): Promise<boolean> {
        const all = await this.load(config);
        const index = all.findIndex(r => r.id === request.id);
        if (index !== -1) {
            all[index] = request;
        } else {
            all.push(request);
        }
        return await this.save(all, config);
    },

    async getGrants(object: any, config: StorageConfig): Promise<Grant[]> {
        // In localStorage mode, grants are stored separately
        const grantsKey = `uc_grants_${object.id}`;
        const grants = localStorage.getItem(grantsKey);
        return grants ? JSON.parse(grants) : [];
    }
};
