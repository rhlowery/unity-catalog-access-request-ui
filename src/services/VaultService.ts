/**
 * Service to interact with HashiCorp Vault (KV Secrets Engine).
 *
 * Capability:
 * - Fetch secrets from standard KV path (v2 supported via conventions).
 */

import { StorageService } from './storage/StorageService';

export const VaultService = {
    /**
     * Fetch a secret value from Vault.
     * @param {string} fullPath - The path to secret (e.g., 'secret/data/my-app')
     * @param {string} key - The JSON key representing the value to retrieve.
     */
    async fetchSecret(fullPath: string, key: string): Promise<string | null> {
        const config = StorageService.getConfig();
        const { vaultUrl, vaultToken, vaultNamespace } = config;

        if (!vaultUrl || !vaultToken) {
            console.error('[VaultService] Missing Vault URL or Token configuration.');
            return null;
        }

        try {
            console.log(`[VaultService] Fetching secret from ${fullPath}...`);

            // Handle Namespace Header if provided (Enterprise Vault)
            const headers: Record<string, string> = {
                'X-Vault-Token': vaultToken,
                'Content-Type': 'application/json'
            };
            if (vaultNamespace) {
                headers['X-Vault-Namespace'] = vaultNamespace;
            }

            // Construct URL. Ensure no double slashes.
            // Note: Standard KV v2 reads are GET /v1/{mount}/data/{path}
            // For simplicity, we assume user provides "api path" or we try to just append.
            // A more robust implementation handles mount points. Here we assume fullPath includes 'data/' if needed.
            const url = `${vaultUrl.replace(/\/$/, '')}/v1/${fullPath.replace(/^\//, '')}`;

            // Use proxy if we have CORS issues, but typically Vault allows CORS if configured.
            // If running locally against localhost Vault, browser might block mix content if app is https, etc.
            // For now, assume direct fetch is okay or handled via same proxy pattern if mapped.

            const response = await fetch(url, { method: 'GET', headers });

            if (!response.ok) {
                throw new Error(`Vault API Error: ${response.status} ${response.statusText}`);
            }

            const json = await response.json();

            // KV V2 response structure: { data: { data: { key: value }, metadata: ... } }
            // KV V1 response structure: { data: { key: value } }

            let secretData = json.data;
            if (json.data && json.data.data) {
                // Handle V2 wrapping
                secretData = json.data.data;
            }

            if (secretData && secretData[key]) {
                return secretData[key];
            } else {
                console.warn(`[VaultService] Key '${key}' not found in secret payload.`);
                return null;
            }

        } catch (error) {
            console.error('[VaultService] Failed to fetch secret:', error);
            return null;
        }
    }
};
