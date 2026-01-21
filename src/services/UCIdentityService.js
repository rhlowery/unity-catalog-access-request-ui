/**
 * Service to fetch identities (Users, Groups, Service Principals) 
 * from Unity Catalog (Databricks) via SCIM APIs.
 * 
 * Requires Vite Proxy configuration to handle CORS.
 */

import { StorageService } from './storage/StorageService';

const API_BASE = '/api/2.0/preview/scim/v2';

// Simple in-memory cache for demo purposes
let cachedToken = null;

const getM2MToken = async (config) => {
    if (cachedToken) return cachedToken;

    if (!config.ucClientId || !config.ucClientSecret) {
        console.warn("Missing UC Client ID/Secret for M2M Auth.");
        return null;
    }

    try {
        console.log("Exchanging M2M credentials for token...");
        // Note: usage of URLSearchParams for x-www-form-urlencoded
        const body = new URLSearchParams();
        body.append('grant_type', 'client_credentials');
        body.append('client_id', config.ucClientId);
        body.append('client_secret', config.ucClientSecret);
        body.append('scope', 'all-apis');

        // We use the proxy '/api' prefix to handle CORS to the Databricks host
        // The token endpoint is usually /oidc/v1/token on the workspace URL
        const tokenRes = await fetch('/api/oidc/v1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });

        if (!tokenRes.ok) throw new Error('Token exchange failed');

        const data = await tokenRes.json();
        cachedToken = data.access_token;
        return data.access_token;
    } catch (e) {
        console.error("M2M Token Exchange Error:", e);
        return null;
    }
};

export const fetchUCIdentities = async () => {
    try {
        const config = StorageService.getConfig();
        const hostInfo = config.ucHost ? `Configured Host (${config.ucHost})` : 'Env/Proxy Host';

        // 1. Get Token via M2M
        const accessToken = await getM2MToken(config);
        const headers = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        console.log(`Fetching identities from Unity Catalog via ${hostInfo}...`);

        const [usersRes, groupsRes, spRes] = await Promise.allSettled([
            fetch(`${API_BASE}/Users`, { headers }),
            fetch(`${API_BASE}/Groups`, { headers }),
            fetch(`${API_BASE}/ServicePrincipals`, { headers })
        ]);

        const users = usersRes.status === 'fulfilled' ? await usersRes.value.json() : { Resources: [] };
        const groups = groupsRes.status === 'fulfilled' ? await groupsRes.value.json() : { Resources: [] };
        const sps = spRes.status === 'fulfilled' ? await spRes.value.json() : { Resources: [] };

        // Normalize Data
        const normalizedUsers = (users.Resources || []).map(u => ({
            id: u.id,
            name: u.userName || u.displayName, // SCIM users usually have userName
            email: u.userName,
            type: 'USER'
        }));

        const normalizedGroups = (groups.Resources || []).map(g => ({
            id: g.id,
            name: g.displayName,
            type: 'GROUP'
        }));

        const normalizedSPs = (sps.Resources || []).map(sp => ({
            id: sp.id,
            name: sp.displayName || sp.applicationId,
            type: 'SERVICE_PRINCIPAL'
        }));

        console.log(`Fetched ${normalizedUsers.length} users, ${normalizedGroups.length} groups, ${normalizedSPs.length} SPs.`);

        return {
            users: normalizedUsers,
            groups: normalizedGroups,
            servicePrincipals: normalizedSPs
        };

    } catch (error) {
        console.error("Failed to fetch UC Identities:", error);
        return null; // Signal to fall back to mock data
    }
};

export const fetchWorkspaces = async () => {
    try {
        const config = StorageService.getConfig();
        if (config.ucAuthType !== 'ACCOUNT' || !config.ucAccountId) return [];

        // Mock implementation for demo if no real credentials
        // In real impl, this would hit /api/2.0/accounts/{id}/workspaces
        console.log(`Fetching workspaces for Account ${config.ucAccountId}...`);

        // Return mock workspaces for now to demonstrate UI
        return [
            { id: '1111', name: 'Engineering Workspace', url: 'https://adb-1111.1.azuredatabricks.net' },
            { id: '2222', name: 'Data Science Workspace', url: 'https://adb-2222.2.azuredatabricks.net' },
            { id: '3333', name: 'Marketing Workspace', url: 'https://adb-3333.3.azuredatabricks.net' }
        ];

    } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        return [];
    }
};
