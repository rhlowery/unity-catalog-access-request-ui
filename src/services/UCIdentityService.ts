/**
 * Service to fetch identities (Users, Groups, Service Principals) 
 * from Unity Catalog (Databricks) via SCIM APIs.
 * 
 * Requires Vite Proxy configuration to handle CORS.
 */

import { StorageService } from './storage/StorageService';
import { ConfigService } from './config/ConfigService';
import { SecretsService } from './secrets/SecretsService';

const API_BASE = '/api/2.0/preview/scim/v2';

// Simple in-memory cache for demo purposes
let cachedToken = null;

export const clearTokenCache = () => { cachedToken = null; };

const getAccountBaseUrl = (config) => {
    if (config.ucHost) return config.ucHost.startsWith('http') ? config.ucHost : `https://${config.ucHost}`;

    // Azure uses a different account console domain
    if (config.ucCloudProvider === 'AZURE') {
        return 'https://accounts.azuredatabricks.net';
    }
    // AWS and GCP use the standard domain
    return 'https://accounts.cloud.databricks.com';
};

export const getM2MToken = async (config) => {
    // If we've already initialized, we don't necessarily need to return a token here
    // since the BFF holds it in a cookie. But for legacy compatibility, we'll return a placeholder
    // or check if the session is active.
    if (cachedToken) return cachedToken;

    // Resolve Secret if from Vault
    let clientSecret = config.ucClientSecret;
    if (config.ucClientSecretSource === 'VAULTED') {
        clientSecret = await SecretsService.resolveSecret(
            config.vaultSecretPath,
            config.ucClientSecretVaultKey,
            config.ucClientSecret // Use current value as fallback
        );
    }

    if (!config.ucClientId || !clientSecret) {
        console.warn("Missing UC Client ID/Secret for M2M Auth.");
        return null;
    }

    try {
        console.log("Exchanging M2M credentials via BFF...");
        const baseUrl = getAccountBaseUrl(config);
        const host = new URL(baseUrl).hostname;

        // Route through BFF to keep client_secret off the browser
        const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';

        // Security: We only send the host. The BFF resolves clientId/clientSecret from its own .env
        const tokenRes = await fetch(`${BFF_URL}/api/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Important for cookies
            body: JSON.stringify({
                host: host
            })
        });

        if (!tokenRes.ok) {
            const errorBody = await tokenRes.text().catch(() => 'No body');
            console.error(`[UCIdentityService] BFF Token exchange failed. Status: ${tokenRes.status}, Body: ${errorBody}`);
            throw new Error(`Token exchange failed with status ${tokenRes.status}`);
        }

        const data = await tokenRes.json();
        // Since the token is in the cookie, we can return a placeholder or something to signal success
        cachedToken = 'COOKIE_BASED_TOKEN';
        console.log("[UCIdentityService] Token exchange successful; stored in cookie.");
        return cachedToken;
    } catch (e) {
        console.error("[UCIdentityService] M2M Token Exchange Error:", e);
        return null;
    }
};

export const fetchUCIdentities = async () => {
    try {
        const config = await ConfigService.getResolvedConfig();

        // 1. Ensure we have a valid session/cookie
        await getM2MToken(config);

        const baseUrl = getAccountBaseUrl(config);

        // Determine SCIM API Path
        let scimPath = '/api/2.0/preview/scim/v2';
        if (config.ucAuthType === 'ACCOUNT') {
            if (!config.ucAccountId) {
                throw new Error("Missing Account ID for Account SCIM fetch");
            }
            scimPath = `/api/2.0/accounts/${config.ucAccountId}/scim/v2`;
        }

        console.log(`Fetching identities from Unity Catalog via BFF (Cookie-based)...`);

        const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
        const scimBase = `${BFF_URL}/api/scim`;

        const bffHeaders = { 'x-scim-host': new URL(baseUrl).hostname };

        const [usersRes, groupsRes, spRes] = await Promise.allSettled([
            fetch(`${scimBase}${scimPath}/Users`, { headers: bffHeaders, credentials: 'include' }),
            fetch(`${scimBase}${scimPath}/Groups`, { headers: bffHeaders, credentials: 'include' }),
            fetch(`${scimBase}${scimPath}/ServicePrincipals`, { headers: bffHeaders, credentials: 'include' })
        ]);
        // ... (rest of the normalization logic)

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
        const config = await ConfigService.getResolvedConfig();
        if (config.ucAuthType !== 'ACCOUNT') return [];
        if (!config.ucAccountId) {
            console.warn("[UCIdentityService] ucAccountId is missing in ACCOUNT mode.");
            return [];
        }

        // 1. Ensure cookie is set
        await getM2MToken(config);

        const baseUrl = getAccountBaseUrl(config);
        const workspaceHost = new URL(baseUrl).hostname;

        const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
        // Route through BFF /api/uc proxy
        const workspacesUrl = `${BFF_URL}/api/uc/api/2.0/accounts/${config.ucAccountId}/workspaces`;

        console.log(`[UCIdentityService] Fetching Workspaces via BFF (Cookie-based): ${workspacesUrl}`);

        const res = await fetch(workspacesUrl, {
            headers: {
                'x-workspace-host': workspaceHost
            },
            credentials: 'include'
        });
        if (!res.ok) {
            const errorBody = await res.text().catch(() => 'No body');
            console.error(`[UCIdentityService] Workspaces Fetch Failed. Status: ${res.status}, Body: ${errorBody}`);
            throw new Error(`Workspaces Fetch Failed: ${res.statusText}`);
        }

        const data = await res.json();
        console.log(`[UCIdentityService] Successfully fetched ${data.length || 0} workspaces.`);

        const hostUrl = new URL(baseUrl);
        const domain = hostUrl.hostname.split('.').slice(1).join('.');

        return (data.map(ws => ({
            id: ws.workspace_id,
            name: ws.workspace_name,
            url: `https://${ws.deployment_name}.${domain}`
        })));

    } catch (error) {
        console.error("[UCIdentityService] Failed to fetch workspaces:", error);
        throw error;
    }
};

export const fetchCatalogs = async (workspaceUrl) => {
    try {
        const config = await ConfigService.getResolvedConfig();

        // 1. Ensure cookie is set
        await getM2MToken(config);

        const workspaceHost = new URL(workspaceUrl).hostname;
        const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
        const bffBase = `${BFF_URL}/api/uc`;
        const bffHeaders = {
            'x-workspace-host': workspaceHost
        };

        console.log(`[UCIdentityService] Fetching catalogs via BFF (Cookie-based) for ${workspaceHost}...`);

        // 1. Fetch Catalogs via BFF
        const catalogsRes = await fetch(`${bffBase}/catalogs`, {
            headers: bffHeaders,
            credentials: 'include'
        }).catch(e => {
            console.error(`[UCIdentityService] Network error fetching catalogs:`, e);
            return null;
        });

        if (!catalogsRes || !catalogsRes.ok) {
            const status = catalogsRes ? `${catalogsRes.status} ${catalogsRes.statusText}` : 'Network Error';
            console.warn(`[UCIdentityService] Failed to fetch catalogs (${status}). Using Mock data for demo.`);
            return null;
        }

        const catalogsData = await catalogsRes.json();
        const catalogs = catalogsData.catalogs || [];
        console.log(`[UCIdentityService] Found ${catalogs.length} catalogs.`);

        // 2. Build Tree (Parallel fetch for Schemas)
        const tree = await Promise.all(catalogs.map(async (cat) => {
            const catNode = {
                id: cat.name, // using name as ID for simplicity or cat.catalog_name
                name: cat.name,
                type: 'CATALOG',
                children: []
            };

            // Fetch Schemas via BFF
            const schemasRes = await fetch(`${bffBase}/schemas?catalog_name=${cat.name}`, {
                headers: bffHeaders,
                credentials: 'include'
            }).catch(() => null);
            if (schemasRes && schemasRes.ok) {
                const schemasData = await schemasRes.json();
                const schemas = schemasData.schemas || [];

                catNode.children = await Promise.all(schemas.map(async (sch) => {
                    const schNode = {
                        id: `${cat.name}.${sch.name}`,
                        name: sch.name,
                        type: 'SCHEMA',
                        parentId: catNode.id,
                        children: []
                    };

                    // Fetch Tables via BFF
                    const tablesRes = await fetch(`${bffBase}/tables?catalog_name=${cat.name}&schema_name=${sch.name}`, {
                        headers: bffHeaders,
                        credentials: 'include'
                    }).catch(() => null);
                    if (tablesRes && tablesRes.ok) {
                        const tablesData = await tablesRes.json();
                        const tables = tablesData.tables || [];
                        schNode.children = tables.map(tbl => ({
                            id: `${cat.name}.${sch.name}.${tbl.name}`,
                            name: tbl.name,
                            type: tbl.table_type === 'VIEW' ? 'VIEW' : 'TABLE',
                            parentId: schNode.id,
                            owners: [tbl.owner]
                        }));
                    }
                    return schNode;
                }));
            }
            return catNode;
        }));

        return tree;
    } catch (e) {
        console.error("Error in fetchCatalogs:", e);
        return null;
    }
};
