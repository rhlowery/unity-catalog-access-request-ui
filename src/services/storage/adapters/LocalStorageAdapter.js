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
    }
};
