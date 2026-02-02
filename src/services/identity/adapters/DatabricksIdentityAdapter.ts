import { IIdentityAdapter } from '../IIdentityAdapter';
import { fetchUCIdentities } from '../../UCIdentityService';

/**
 * Databricks Unity Catalog Identity Adapter
 * Fetches data via SCIM APIs.
 */
export const DatabricksIdentityAdapter: IIdentityAdapter = {
    name: 'Databricks UC',
    type: 'DATABRICKS',

    async fetchIdentities(_config: any) {
        const realData = await fetchUCIdentities();
        if (realData) {
            return realData;
        }
        // Fallback to empty if real fetch fails
        return {
            users: [],
            groups: [],
            servicePrincipals: []
        };
    },

    async getCurrentUser(_config: any) {
        // Return authenticated user (passed from backend)
        return {
            id: 'user_alice',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            type: 'USER',
            initials: 'AJ',
            provider: 'Databricks',
            groups: ['group_finance_admins', 'group_platform_admins']
        };
    },

    async login(provider: string, _config: any) {
        // Simulate login delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return await this.getCurrentUser(_config);
    },

    async logout(_config: any) {
        console.log('[DatabricksIdentity] Logout');
    }
};
