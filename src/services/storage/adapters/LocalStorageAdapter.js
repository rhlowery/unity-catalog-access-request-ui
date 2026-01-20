/**
 * Default Local Storage Adapter
 * Persists data in the browser's localStorage.
 */
const STORAGE_KEY = 'uc_access_requests_v1';

export const LocalStorageAdapter = {
    name: 'Local Storage',
    type: 'LOCAL',

    async load() {
        // Simulate async network delay for realism if desired, but keeping fast for local
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    async save(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    }
};
