import { StorageService } from '../storage/StorageService';
import { MockIdentityAdapter } from './adapters/MockIdentityAdapter';
import { DatabricksIdentityAdapter } from './adapters/DatabricksIdentityAdapter';
import { IIdentityAdapter, IdentityUser } from './IIdentityAdapter';

const ADAPTERS: Record<string, IIdentityAdapter> = {
    'MOCK': MockIdentityAdapter,
    'OAUTH': MockIdentityAdapter, // Fallback to mock for demo
    'SAML': MockIdentityAdapter, // Fallback to mock for demo
    'DATABRICKS': DatabricksIdentityAdapter,
    'GOOGLE': MockIdentityAdapter, // OAuth providers - fallback to mock
    'MICROSOFT': MockIdentityAdapter,
    'GENERIC_OAUTH': MockIdentityAdapter,
};

export const IdentityService = {
    getAdapter(): IIdentityAdapter {
        const config = StorageService.getConfig();
        const type = config.identityType || 'MOCK';
        
        console.log(`[IdentityService] Config identityType: ${type}`);
        const selectedAdapter = ADAPTERS[type] || MockIdentityAdapter;
        console.log(`[IdentityService] Selected adapter: ${selectedAdapter.name}`);
        return selectedAdapter;
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
