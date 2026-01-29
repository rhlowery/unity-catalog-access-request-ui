import { StorageService } from '../storage/StorageService';
import { MockIdentityAdapter } from './adapters/MockIdentityAdapter';
import { DatabricksIdentityAdapter } from './adapters/DatabricksIdentityAdapter';

const ADAPTERS = {
    'MOCK': MockIdentityAdapter,
    'DATABRICKS': DatabricksIdentityAdapter,
};

export const IdentityService = {
    getAdapter() {
        const config = StorageService.getConfig();
        // Fallback logic for configuration
        let type = config.identityType || 'MOCK';

        // If SCIM is enabled, we likely want the Databricks adapter for identity fetching
        if (config.scimEnabled && type === 'MOCK') {
            type = 'DATABRICKS';
        }

        return ADAPTERS[type] || MockIdentityAdapter;
    },

    async fetchIdentities() {
        const adapter = this.getAdapter();
        const config = StorageService.getConfig();
        console.log(`[IdentityService] Fetching identities using ${adapter.name}`);
        return await adapter.fetchIdentities(config);
    },

    async getCurrentUser() {
        const adapter = this.getAdapter();
        const config = StorageService.getConfig();
        return await adapter.getCurrentUser(config);
    }
};
