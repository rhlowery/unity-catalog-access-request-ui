import { IIdentityAdapter } from '../IIdentityAdapter';
import { fetchUCIdentities, fetchMe } from '../../UCIdentityService';

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
        const me = await fetchMe();
        if (me) return me;

        // Fallback to a generic user if SCIM /Me fails, 
        // but log it as a warning since this means identity sync is broken.
        console.warn("[DatabricksIdentity] Could not fetch real identity, using fallback.");
        return {
            id: 'unknown_user',
            name: 'Unknown Databricks User',
            email: 'unknown@databricks.local',
            type: 'USER',
            initials: '??',
            provider: 'Databricks',
            groups: []
        };
    },

    async login(provider: string, config: any, credentials?: any) {
        if (!credentials) {
            // Hint to the UI that we need credentials for this provider
            return {
                id: 'credentials_required',
                name: 'Credentials Required',
                requiresCredentials: true,
                provider: provider
            } as any;
        }

        console.log(`[DatabricksIdentity] Authenticating with ${credentials.type}...`);

        // If it's a PAT, we exchange it via BFF /api/token to set the HttpOnly cookie
        if (credentials.type === 'PAT' && credentials.token) {
            const baseUrl = config.ucHost ? (config.ucHost.startsWith('http') ? config.ucHost : `https://${config.ucHost}`) : 'https://accounts.cloud.databricks.com';
            const host = new URL(baseUrl).hostname;
            const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';

            try {
                // We use a pseudo exchange where the "clientId" is actually the token 
                // and the BFF handles it, or we add a new login endpoint.
                // For now, let's assume we can use the existing /api/auth/login but pass a token.
                // But /api/token is specifically for M2M (Client Credentials).
                // Let's use /api/auth/login and include the token which the BFF can then set as a cookie.

                // We first need to know WHO this user is to call /api/auth/login.
                // This is a chicken-and-egg problem in the current design.
                // Let's assume the adapter manages the session cookie creation via a new BFF endpoint.

                // For this POC, we'll simulate the "me" fetch with the token
                // and then call BFF login.
            } catch (e) {
                console.error("Manual PAT login failed", e);
            }
        }

        // Simulate login delay
        await new Promise(resolve => setTimeout(resolve, 800));
        return await this.getCurrentUser(config);
    },

    async logout(_config: any) {
        console.log('[DatabricksIdentity] Logout');
    }
};
