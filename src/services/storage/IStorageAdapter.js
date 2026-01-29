/**
 * Interface for Storage Adapters.
 * All storage adapters must implement these methods.
 */
export const IStorageAdapter = {
    name: 'Abstract Storage Adapter',
    type: 'ABSTRACT',

    /**
     * Loads all requests.
     * @param {Object} config - The global app configuration.
     * @returns {Promise<Array>} - List of requests.
     */
    async load(config) {
        throw new Error('Not implemented');
    },

    /**
     * Saves all requests.
     * @param {Array} data - All requests to save.
     * @param {Object} config - The global app configuration.
     * @returns {Promise<boolean>} - Success status.
     */
    async save(data, config) {
        throw new Error('Not implemented');
    },

    /**
     * Upserts a single request.
     * @param {Object} request - The request to upsert.
     * @param {Object} config - The global app configuration.
     * @returns {Promise<boolean>} - Success status.
     */
    async upsertRequest(request, config) {
        throw new Error('Not implemented');
    },

    /**
     * Gets approved grants for a specific object.
     * @param {Object} object - The object (catalog/schema/table).
     * @param {Object} config - The global app configuration.
     * @returns {Promise<Array>} - List of grants.
     */
    async getGrants(object, config) {
        throw new Error('Not implemented');
    }
};
