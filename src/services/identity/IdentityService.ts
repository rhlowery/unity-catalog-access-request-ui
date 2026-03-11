import { StorageService } from '../storage/StorageService';
import { ConfigService } from '../config/ConfigService';
import { MockIdentityAdapter } from './adapters/MockIdentityAdapter';
import { DatabricksIdentityAdapter } from './adapters/DatabricksIdentityAdapter';
import { IIdentityAdapter, IdentityUser } from './IIdentityAdapter';

const ADAPTERS: Record<string, IIdentityAdapter> = {
    'MOCK': MockIdentityAdapter,
    'OAUTH': MockIdentityAdapter, // Fallback to mock for demo
    'SAML': MockIdentityAdapter, // Fallback to mock for demo
    'DATABRICKS': DatabricksIdentityAdapter,
    'DATABRICKS_WORKSPACE': DatabricksIdentityAdapter,
    'DATABRICKS_ACCOUNT': DatabricksIdentityAdapter,
    'GOOGLE': MockIdentityAdapter, // OAuth providers - fallback to mock
    'MICROSOFT': MockIdentityAdapter,
    'GENERIC_OAUTH': MockIdentityAdapter,
};

export const IdentityService = {
    /**
     * Resolves the active Identity Provider Adapter based on configuration.
     * @returns {IIdentityAdapter} The configured identity adapter.
     */
    getAdapter(): IIdentityAdapter {
        const config = ConfigService.getConfig();
        const type = config.identityType || 'MOCK';

        console.log(`[IdentityService] Config identityType: ${type}`);
        const selectedAdapter = ADAPTERS[type] || MockIdentityAdapter;
        console.log(`[IdentityService] Selected adapter: ${selectedAdapter.name}`);
        return selectedAdapter;
    },

    /**
     * Fetches all available identities from the configured provider.
     * @returns {Promise<{ users: IdentityUser[]; groups: IdentityUser[]; servicePrincipals: IdentityUser[] }>}
     */
    async fetchIdentities(): Promise<{ users: IdentityUser[]; groups: IdentityUser[]; servicePrincipals: IdentityUser[] }> {
        const adapter = this.getAdapter();
        const config = await ConfigService.getResolvedConfig();
        console.log(`[IdentityService] Fetching identities using ${adapter.name}`);
        return await adapter.fetchIdentities(config);
    },

    /**
     * Fetches the currently authenticated user's profile.
     * @returns {Promise<IdentityUser | null>} The active user profile.
     */
    async getCurrentUser(): Promise<IdentityUser | null> {
        const adapter = this.getAdapter();
        const config = await ConfigService.getResolvedConfig();
        return await adapter.getCurrentUser(config);
    },

    /**
     * Authenticates a user against a specific provider.
     * @param {string} provider - The string ID of the authentication provider.
     * @param {any} credentials - Optional credentials (user/pass or token).
     * @returns {Promise<IdentityUser>} The authenticated user profile.
     */
    async login(provider: string, credentials?: any): Promise<IdentityUser> {
        const adapter = this.getAdapter();
        const config = await ConfigService.getResolvedConfig();
        if (!adapter.login) {
            throw new Error('Login not supported by current adapter');
        }
        return await adapter.login(provider, config, credentials);
    },

    /**
     * Ends the current user's active session across the idp.
     * @returns {Promise<void>}
     */
    async logout(): Promise<void> {
        const adapter = this.getAdapter();
        if (adapter.logout) {
            await adapter.logout();
        }
    }
};
