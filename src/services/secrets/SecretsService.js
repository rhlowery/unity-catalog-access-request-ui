import { StorageService } from '../storage/StorageService';
import { EnvAdapter } from './adapters/EnvAdapter';
import { VaultAdapter } from './adapters/VaultAdapter';

const ADAPTERS = {
    'PLAIN': EnvAdapter,
    'VAULT': VaultAdapter,
};

export const SecretsService = {
    getAdapter() {
        const config = StorageService.getConfig();
        const type = config.ucClientSecretSource || 'PLAIN';
        return ADAPTERS[type] || EnvAdapter;
    },

    /**
     * Resolves a secret. 
     * If source is PLAIN, it returns the provided fallback value.
     * If source is VAULT, it fetches from Vault.
     */
    async resolveSecret(path, key, fallbackValue) {
        const config = StorageService.getConfig();
        const source = config.ucClientSecretSource || 'PLAIN';

        if (source === 'PLAIN') {
            return fallbackValue;
        }

        const adapter = this.getAdapter();
        console.log(`[SecretsService] Resolving secret from ${adapter.name} at ${path}`);
        return await adapter.getSecret(path, key, config);
    }
};
