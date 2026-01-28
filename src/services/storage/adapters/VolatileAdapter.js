/**
 * Mock (Volatile) Storage Adapter
 * Persists data only in memory for the current session.
 */
let memoryStore = [];

export const VolatileAdapter = {
    name: 'Mock (Volatile)',
    type: 'MOCK',

    async load() {
        return [...memoryStore];
    },

    async save(data) {
        memoryStore = [...data];
        return true;
    },

    async upsertRequest(request) {
        const index = memoryStore.findIndex(r => r.id === request.id);
        if (index !== -1) {
            memoryStore[index] = request;
        } else {
            memoryStore.push(request);
        }
        return true;
    },

    async getGrants(object, config) {
        // 1. Filter for APPROVED requests that target this object
        const grants = [];
        memoryStore
            .filter(r => r.status === 'APPROVED')
            .forEach(r => {
                const targetsObject = r.requestedObjects.some(o => o.id === object.id);
                if (targetsObject) {
                    (r.principals || []).forEach(principal => {
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
