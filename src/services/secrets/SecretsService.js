import { EnvAdapter } from './adapters/EnvAdapter';
import { VaultAdapter } from './adapters/VaultAdapter';
import { MockVaultAdapter } from './adapters/MockVaultAdapter';

const ADAPTERS = {
    'PLAIN': EnvAdapter,
    'VAULT': VaultAdapter,
    'MOCK_VAULT': MockVaultAdapter,
};

export const SecretsService = {
    getAdapter() {
        const config = StorageService.getConfig();
        const type = config.globalSecretProvider || 'PLAIN';
        return ADAPTERS[type] || EnvAdapter;
    },

    /**
     * Resolves a secret. 
     */
    async resolveSecret(path, key, fallbackValue) {
        const config = StorageService.getConfig();
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
