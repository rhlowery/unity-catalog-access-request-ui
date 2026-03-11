/**
 * Service to interact with HashiCorp Vault (KV Secrets Engine).
 *
 * Capability:
 * - Fetch secrets from standard KV path (v2 supported via conventions).
 */

import { StorageService } from './storage/StorageService';
import { ConfigService } from './config/ConfigService';

export const VaultService = {
    /**
     * Fetch a secret value from Vault.
     * @param {string} fullPath - The path to secret (e.g., 'secret/data/my-app')
     * @param {string} key - The JSON key representing the value to retrieve.
     */
    async fetchSecret(fullPath: string, key: string): Promise<string | null> {
        const config = ConfigService.getConfig();
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
            const url = `${vaultUrl.replace(/\/$/, '')}/v1/${fullPath.replace(/^\//, '')}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Vault API Error: ${response.status} ${response.statusText}`);
            }

            const json = await response.json();

            // KV V2 response structure: { data: { data: { key: value }, metadata: ... } }
            // KV V1 response structure: { data: { key: value } }

            let secretData = json.data;
            if (json.data && json.data.data) {
                secretData = json.data.data;
            }

            if (secretData && secretData[key]) {
                return secretData[key];
            } else {
                console.warn(`[VaultService] Key '${key}' not found in secret payload.`);
                return null;
            }

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.error('[VaultService] Request timed out after 10 seconds');
            } else {
                console.error('[VaultService] Failed to fetch secret:', error);
            }
            return null;
        }
    }
};
