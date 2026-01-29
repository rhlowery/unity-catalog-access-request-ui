/**
 * Interface for Identity Adapters.
 * Handles user/group/service-principal fetching and authentication context.
 */
export const IIdentityAdapter = {
    name: 'Abstract Identity Adapter',
    type: 'ABSTRACT',

    /**
     * Fetches identities (users, groups, service principals).
     * @param {Object} config - The global app configuration.
     * @returns {Promise<{users: Array, groups: Array, servicePrincipals: Array}>}
     */
    async fetchIdentities(config) {
        throw new Error('Not implemented');
    },

    /**
     * Gets the current user context if the adapter handles SSO.
     * @param {Object} config - The global app configuration.
     * @returns {Promise<Object|null>}
     */
    async getCurrentUser(config) {
        return null; // Default to no-op for adapters that don't handle auth
    }
};
