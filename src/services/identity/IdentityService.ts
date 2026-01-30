import { StorageService } from '../storage/StorageService';
import { MockIdentityAdapter } from './adapters/MockIdentityAdapter';
import { DatabricksIdentityAdapter } from './adapters/DatabricksIdentityAdapter';
import { IIdentityAdapter, IdentityUser } from './IIdentityAdapter';

const ADAPTERS: Record<string, IIdentityAdapter> = {
    'MOCK': MockIdentityAdapter,
    'DATABRICKS': DatabricksIdentityAdapter,
};

export const IdentityService = {
    getAdapter(): IIdentityAdapter {
        const config = StorageService.getConfig();
        // Fallback logic for configuration
        let type: string = config.identityType || 'MOCK';

        // If SCIM is enabled, we likely want the Databricks adapter for identity fetching
        if (config.scimEnabled && type === 'MOCK') {
            type = 'DATABRICKS';
        }

        return ADAPTERS[type] || MockIdentityAdapter;
    },

    async fetchIdentities(): Promise<{ users: IdentityUser[]; groups: IdentityUser[]; servicePrincipals: IdentityUser[] }> {
        const adapter = this.getAdapter();
        const config = await StorageService.getResolvedConfig();
        console.log(`[IdentityService] Fetching identities using ${adapter.name}`);
        return await adapter.fetchIdentities(config);
    },

    async getCurrentUser(): Promise<IdentityUser | null> {
        const adapter = this.getAdapter();
        const config = await StorageService.getResolvedConfig();
        return await adapter.getCurrentUser(config);
    },

    async login(provider: string): Promise<IdentityUser> {
        const adapter = this.getAdapter();
        const config = await StorageService.getResolvedConfig();
        if (!adapter.login) {
            throw new Error('Login not supported by current adapter');
        }
        return await adapter.login(provider, config);
    },

    async logout(): Promise<void> {
        const adapter = this.getAdapter();
        if (adapter.logout) {
            await adapter.logout();
        }
    }
};
