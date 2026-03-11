/**
 * Default Local Storage Adapter
 * Persists data in browser's localStorage.
 */
import { IStorageAdapter, StorageConfig, AccessRequest, Grant } from '../IStorageAdapter';

const STORAGE_KEY = 'uc_access_requests_v1';

const isValidAccessRequest = (data: unknown): data is AccessRequest => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return typeof obj.id === 'string' || typeof obj.catalogName === 'string';
};

const isAccessRequestArray = (data: unknown): data is AccessRequest[] => {
    return Array.isArray(data) && data.every(item => isValidAccessRequest(item));
};

export const LocalStorageAdapter: IStorageAdapter = {
    name: 'Local Storage',
    type: 'LOCAL',

    async load(config: StorageConfig): Promise<AccessRequest[]> {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            if (!isAccessRequestArray(parsed)) {
                console.warn('[LocalStorageAdapter] Invalid data format in storage, clearing...');
                localStorage.removeItem(STORAGE_KEY);
                return [];
            }
            return parsed;
        } catch {
            console.warn('[LocalStorageAdapter] Failed to parse storage data, clearing...');
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
    },

    async save(data: AccessRequest[], config: StorageConfig): Promise<boolean> {
        if (!isAccessRequestArray(data)) {
            console.error('[LocalStorageAdapter] Invalid data format');
            return false;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('[LocalStorageAdapter] Failed to save:', e);
            return false;
        }
    },

    async upsertRequest(request: AccessRequest, config: StorageConfig): Promise<boolean> {
        if (!isValidAccessRequest(request)) {
            console.error('[LocalStorageAdapter] Invalid request format');
            return false;
        }
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
        const grantsKey = `uc_grants_${object.id}`;
        try {
            const grants = localStorage.getItem(grantsKey);
            if (!grants) return [];
            const parsed = JSON.parse(grants);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            localStorage.removeItem(grantsKey);
            return [];
        }
    },

    async getApprovers(config: StorageConfig): Promise<Record<string, string[]>> {
        const approversKey = 'uc_object_approvers_v1';
        try {
            const data = localStorage.getItem(approversKey);
            if (!data) return {};
            const parsed = JSON.parse(data);
            const identityType = config.identityType || 'MOCK';
            return parsed[identityType] || {};
        } catch {
            return {};
        }
    },

    async saveApprovers(approvers: Record<string, string[]>, config: StorageConfig): Promise<boolean> {
        const approversKey = 'uc_object_approvers_v1';
        try {
            const data = localStorage.getItem(approversKey);
            const parsed = data ? JSON.parse(data) : {};
            const identityType = config.identityType || 'MOCK';
            parsed[identityType] = approvers;
            localStorage.setItem(approversKey, JSON.stringify(parsed));
            return true;
        } catch (e) {
            console.error('[LocalStorageAdapter] Failed to save approvers:', e);
            return false;
        }
    }
};
