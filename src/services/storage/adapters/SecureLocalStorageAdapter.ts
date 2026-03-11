import { IStorageAdapter, StorageConfig, AccessRequest, Grant } from '../IStorageAdapter';
import { WebCrypto } from '../../crypto/WebCryptoService';

const STORAGE_KEY = 'uc_access_requests_secure_v1';
const APPROVERS_KEY = 'uc_object_approvers_secure_v1';

const isValidAccessRequest = (data: unknown): data is AccessRequest => {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return typeof obj.id === 'string' || typeof obj.catalogName === 'string';
};

const isAccessRequestArray = (data: unknown): data is AccessRequest[] => {
    return Array.isArray(data) && data.every(item => isValidAccessRequest(item));
};

export const SecureLocalStorageAdapter: IStorageAdapter = {
    name: 'Secure Local Storage',
    type: 'SECURE_LOCAL',

    async load(config: StorageConfig): Promise<AccessRequest[]> {
        try {
            const encrypted = localStorage.getItem(STORAGE_KEY);
            if (!encrypted) return [];

            const decrypted = await WebCrypto.decrypt(encrypted);
            const parsed = JSON.parse(decrypted);

            if (!isAccessRequestArray(parsed)) {
                console.warn('[SecureLocalStorageAdapter] Invalid data format in storage');
                return [];
            }
            return parsed;
        } catch (error) {
            console.warn('[SecureLocalStorageAdapter] Failed to load/decrypt storage data:', error);
            return [];
        }
    },

    async save(data: AccessRequest[], config: StorageConfig): Promise<boolean> {
        if (!isAccessRequestArray(data)) {
            console.error('[SecureLocalStorageAdapter] Invalid data format');
            return false;
        }
        try {
            const json = JSON.stringify(data);
            const encrypted = await WebCrypto.encrypt(json);
            localStorage.setItem(STORAGE_KEY, encrypted);
            return true;
        } catch (e) {
            console.error('[SecureLocalStorageAdapter] Failed to save/encrypt:', e);
            return false;
        }
    },

    async upsertRequest(request: AccessRequest, config: StorageConfig): Promise<boolean> {
        if (!isValidAccessRequest(request)) {
            console.error('[SecureLocalStorageAdapter] Invalid request format');
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
        const grantsKey = `uc_grants_secure_${object.id}`;
        try {
            const encrypted = localStorage.getItem(grantsKey);
            if (!encrypted) return [];

            const decrypted = await WebCrypto.decrypt(encrypted);
            const parsed = JSON.parse(decrypted);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    async getApprovers(config: StorageConfig): Promise<Record<string, string[]>> {
        try {
            const encrypted = localStorage.getItem(APPROVERS_KEY);
            if (!encrypted) return {};

            const decrypted = await WebCrypto.decrypt(encrypted);
            const parsed = JSON.parse(decrypted);
            const identityType = config.identityType || 'MOCK';
            return parsed[identityType] || {};
        } catch {
            return {};
        }
    },

    async saveApprovers(approvers: Record<string, string[]>, config: StorageConfig): Promise<boolean> {
        try {
            const encrypted = localStorage.getItem(APPROVERS_KEY);
            let parsed: Record<string, any> = {};

            if (encrypted) {
                try {
                    const decrypted = await WebCrypto.decrypt(encrypted);
                    parsed = JSON.parse(decrypted);
                } catch (e) {
                    console.warn('[SecureLocalStorageAdapter] Failed to decrypt existing approvers, starting fresh');
                }
            }

            const identityType = config.identityType || 'MOCK';
            parsed[identityType] = approvers;

            const json = JSON.stringify(parsed);
            const newEncrypted = await WebCrypto.encrypt(json);
            localStorage.setItem(APPROVERS_KEY, newEncrypted);
            return true;
        } catch (e) {
            console.error('[SecureLocalStorageAdapter] Failed to save approvers:', e);
            return false;
        }
    }
};
