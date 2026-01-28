/**
 * Default Local Storage Adapter
 * Persists data in the browser's localStorage.
 */
const STORAGE_KEY = 'uc_access_requests_v1';

export const LocalStorageAdapter = {
    name: 'Local Storage',
    type: 'LOCAL',

    async load() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    async save(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    },

    async upsertRequest(request) {
        const all = await this.load();
        const index = all.findIndex(r => r.id === request.id);
        if (index !== -1) {
            all[index] = request;
        } else {
            all.push(request);
        }
        return await this.save(all);
    },

    async getGrants(object, config) {
        const requests = await this.load();
        // 1. Filter for APPROVED requests that target this object
        // 2. Flatten to list of grants { principal, permissions }
        const grants = [];
        requests
            .filter(r => r.status === 'APPROVED')
            .forEach(r => {
                const targetsObject = r.requestedObjects.some(o => o.id === object.id);
                if (targetsObject) {
                    r.principals.forEach(principal => {
                        grants.push({
                            principal: principal,
                            permissions: r.permissions,
                            source: 'CONFIGURED',
                            requestId: r.id
                        });
                    });
                }
            });
        return grants;
    }
};
