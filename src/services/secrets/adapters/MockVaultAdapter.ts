import { ISecretsAdapter } from '../ISecretsAdapter';

/**
 * Mock Vault Secrets Adapter
 * Simulates a KV store using localStorage.
 */
const MOCK_VAULT_KEY = 'acs_mock_vault_secrets_v1';

export const MockVaultAdapter: ISecretsAdapter = {
    name: 'Mock Vault',
    type: 'MOCK_VAULT',

    /**
     * Fetches a secret from the mock vault.
     * Expectations: localStorage contains a JSON object where keys are paths 
     * and values are objects containing keys.
     */
    async getSecret(path: string, key: string, _config: any): Promise<string | null> {
        try {
            const raw = localStorage.getItem(MOCK_VAULT_KEY);
            if (!raw) return null;

            const vault = JSON.parse(raw);
            const secretsAtPath = vault[path];

            if (secretsAtPath && secretsAtPath[key]) {
                console.log(`[MockVault] Resolved ${path}/${key}`);
                return secretsAtPath[key];
            }

            console.warn(`[MockVault] Secret not found: ${path}/${key}`);
            return null;
        } catch (e) {
            console.error("[MockVault] Error reading mock secrets:", e);
            return null;
        }
    }
};
