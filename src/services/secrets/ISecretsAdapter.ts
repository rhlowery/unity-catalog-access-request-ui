/**
 * Interface for Secrets Adapters.
 * Handles retrieval of sensitive information.
 */
export interface ISecretsAdapter {
    name: string;
    type: string;

    /**
     * Fetches a secret value.
     * @param path - Path to the secret.
     * @param key - Key within the secret.
     * @param config - The global app configuration.
     * @returns Secret value or null
     */
    getSecret(path: string, key: string, config: any): Promise<string | null>;
}
