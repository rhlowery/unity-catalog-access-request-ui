/**
 * Interface for Catalog Connectivity Adapters.
 * Handles fetching of workspaces, catalogs, schemas, and tables.
 */
export const ICatalogAdapter = {
    name: 'Abstract Catalog Adapter',
    type: 'ABSTRACT',

    /**
     * Fetches available workspaces (if applicable).
     * @param {Object} config - The global app configuration.
     * @returns {Promise<Array>}
     */
    async fetchWorkspaces(config) {
        throw new Error('Not implemented');
    },

    /**
     * Fetches the catalog tree for a specific workspace.
     * @param {string} workspaceUrl - The URL of the workspace.
     * @param {Object} config - The global app configuration.
     * @returns {Promise<Array>} - Hierarchical catalog tree.
     */
    async fetchCatalogs(workspaceUrl, config) {
        throw new Error('Not implemented');
    },

    /**
     * Fetches live grants for an object directly from the catalog.
     * @param {Object} object - The object to check.
     * @param {Object} config - The global app configuration.
     * @returns {Promise<Array>}
     */
    async getLiveGrants(object, config) {
        throw new Error('Not implemented');
    }
};
