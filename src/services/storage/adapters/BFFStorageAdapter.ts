import { IStorageAdapter, AccessRequest, Grant, StorageConfig } from '../IStorageAdapter';
import { SessionManager } from '../../session/SessionManager';

const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';

/**
 * Builds the authentication and identity headers from the active session.
 * These headers allow the BFF to filter requests by user identity and group membership.
 */
const getIdentityHeaders = async (includeCsrf: boolean = false): Promise<Record<string, string>> => {
    const session = await SessionManager.getActiveSession();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (session) {
        headers['X-User-Id'] = session.userId;
        headers['X-User-Groups'] = (session.userGroups || []).join(',');
    }

    if (includeCsrf) {
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf_token='))
            ?.split('=')[1];
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
    }

    return headers;
};

export const BFFStorageAdapter: IStorageAdapter = {
    name: 'BFF Storage',
    type: 'BFF',

    async load(_config: StorageConfig): Promise<AccessRequest[]> {
        try {
            const identityHeaders = await getIdentityHeaders();
            const res = await fetch(`${BFF_URL}/api/storage/requests`, {
                credentials: 'include',
                headers: identityHeaders,
            });
            if (!res.ok) throw new Error('Failed to load requests from BFF');
            return await res.json();
        } catch (e) {
            console.error('[BFFStorageAdapter] Load error:', e);
            return [];
        }
    },

    async save(data: AccessRequest[], _config: StorageConfig): Promise<boolean> {
        try {
            const headers = await getIdentityHeaders(true);
            const res = await fetch(`${BFF_URL}/api/storage/requests`, {
                method: 'POST',
                credentials: 'include',
                headers,
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
    },

    async getApprovers(config: StorageConfig): Promise<Record<string, string[]>> {
        try {
            const identityHeaders = await getIdentityHeaders();
            const res = await fetch(`${BFF_URL}/api/storage/approvers`, {
                credentials: 'include',
                headers: identityHeaders,
            });
            if (!res.ok) {
                if (res.status === 404) return {}; // Fallback if endpoint doesn't exist
                throw new Error('Failed to load approvers from BFF');
            }
            const data = await res.json();
            const identityType = config.identityType || 'MOCK';
            return data[identityType] || {};
        } catch (e) {
            console.error('[BFFStorageAdapter] Load approvers error:', e);
            return {};
        }
    },

    async saveApprovers(approvers: Record<string, string[]>, config: StorageConfig): Promise<boolean> {
        try {
            // Fetch all current data to not overwrite other identity types
            const identityHeaders = await getIdentityHeaders();
            let allData: Record<string, any> = {};
            const getRes = await fetch(`${BFF_URL}/api/storage/approvers`, {
                credentials: 'include',
                headers: identityHeaders,
            });
            if (getRes.ok) {
                allData = await getRes.json();
            }

            const identityType = config.identityType || 'MOCK';
            allData[identityType] = approvers;

            const postHeaders = await getIdentityHeaders(true);
            const res = await fetch(`${BFF_URL}/api/storage/approvers`, {
                method: 'POST',
                credentials: 'include',
                headers: postHeaders,
                body: JSON.stringify(allData)
            });
            return res.ok;
        } catch (e) {
            console.error('[BFFStorageAdapter] Save approvers error:', e);
            return false;
        }
    }
};
