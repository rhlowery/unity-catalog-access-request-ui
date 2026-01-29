/**
 * Interface for Secrets Adapters.
 * Handles retrieval of sensitive information.
 */
export const ISecretsAdapter = {
    name: 'Abstract Secrets Adapter',
    type: 'ABSTRACT',

    /**
     * Fetches a secret value.
     * @param {string} path - Path to the secret.
     * @param {string} key - Key within the secret.
     * @param {Object} config - The global app configuration.
     * @returns {Promise<string|null>}
     */
    async getSecret(path, key, config) {
        throw new Error('Not implemented');
    }
};
