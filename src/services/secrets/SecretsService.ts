import { EnvAdapter } from './adapters/EnvAdapter';
import { VaultAdapter } from './adapters/VaultAdapter';
import { MockVaultAdapter } from './adapters/MockVaultAdapter';
import { StorageService } from '../storage/StorageService';
import { ConfigService } from '../config/ConfigService';

const ADAPTERS = {
    'PLAIN': EnvAdapter,
    'VAULT': VaultAdapter,
    'MOCK_VAULT': MockVaultAdapter,
};

export const SecretsService = {
    /**
     * Resolves the active Secrets Storage Adapter based on application configuration.
     */
    getAdapter() {
        const config = ConfigService.getConfig();
        const type = config.globalSecretProvider || 'PLAIN';
        return ADAPTERS[type] || EnvAdapter;
    },

    /**
     * Resolves a secret from the active vault adapter or falls back to a provided value.
     * @param {string} path - The secret path in the vault.
     * @param {string} key - The specific key mapping.
     * @param {any} fallbackValue - The fallback value if vault resolution fails or plain config is used.
     * @returns {Promise<any>} The resolved secret.
     */
    async resolveSecret(path, key, fallbackValue) {
        const config = ConfigService.getConfig();
        const source = config.globalSecretProvider || 'PLAIN';

        if (source === 'PLAIN' || !key) {
            return fallbackValue;
        }

        const adapter = this.getAdapter();
        console.log(`[SecretsService] Resolving secret from ${adapter.name} at ${path} [key: ${key}]`);
        return await adapter.getSecret(path, key, config);
    },

    /**
     * Resolves an entire configuration object by looking for _useVault flags.
     * Replaces configured keys with their resolved vault counterparts securely in memory.
     * @param {any} config - The raw configuration object.
     * @returns {Promise<any>} A complete configuration with secrets populated.
     */
    async resolveConfig(config) {
        const resolved = { ...config };
        const keys = Object.keys(config);

        for (const key of keys) {
            if (key.endsWith('_useVault') && config[key] === true) {
                const baseKey = key.replace('_useVault', '');
                const vaultKey = config[`${baseKey}_vaultKey`];

                if (vaultKey) {
                    resolved[baseKey] = await this.resolveSecret(config.vaultSecretPath, vaultKey, config[baseKey]);
                }
            }
        }

        return resolved;
    }
};
