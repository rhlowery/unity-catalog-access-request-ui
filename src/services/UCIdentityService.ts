/**
 * Service to fetch identities (Users, Groups, Service Principals) 
 * from Unity Catalog (Databricks) via SCIM APIs.
 * 
 * Requires Vite Proxy configuration to handle CORS.
 */

import { StorageService } from './storage/StorageService';
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
        console.log("Exchanging M2M credentials for token...");
        // Note: usage of URLSearchParams for x-www-form-urlencoded
        const body = new URLSearchParams();
        body.append('grant_type', 'client_credentials');
        body.append('client_id', config.ucClientId);
        body.append('client_secret', clientSecret);
        body.append('scope', 'all-apis');

        const baseUrl = getAccountBaseUrl(config);
        const tokenUrl = `${baseUrl}/oidc/v1/token`;

        console.log(`[UCIdentityService] Token Exchange URL: ${tokenUrl}`);

        // The token endpoint is usually /oidc/v1/token on the workspace URL or account URL
        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });

        if (!tokenRes.ok) {
            const errorBody = await tokenRes.text().catch(() => 'No body');
            console.error(`[UCIdentityService] Token exchange failed. Status: ${tokenRes.status} ${tokenRes.statusText}, Body: ${errorBody}`);
            throw new Error(`Token exchange failed with status ${tokenRes.status}`);
        }

        const data = await tokenRes.json();
        cachedToken = data.access_token;
        console.log("[UCIdentityService] Token successfully retrieved.");
        return data.access_token;
    } catch (e) {
        console.error("[UCIdentityService] M2M Token Exchange Error:", e);
        return null;
    }
};

export const fetchUCIdentities = async () => {
    try {
        const config = await StorageService.getResolvedConfig();
        const _hostInfo = config.ucHost ? `Configured Host (${config.ucHost})` : 'Env/Proxy Host';

        // 1. Get Token via M2M
        const accessToken = await getM2MToken(config);
        const headers = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const baseUrl = getAccountBaseUrl(config);

        // Determine SCIM API Path
        // Account level: /api/2.0/accounts/{account_id}/scim/v2
        // Workspace level: /api/2.0/preview/scim/v2
        let scimPath = '/api/2.0/preview/scim/v2';
        if (config.ucAuthType === 'ACCOUNT') {
            if (!config.ucAccountId) {
                throw new Error("Missing Account ID for Account SCIM fetch");
            }
            scimPath = `/api/2.0/accounts/${config.ucAccountId}/scim/v2`;
        }

        console.log(`Fetching identities from Unity Catalog via ${baseUrl}${scimPath}...`);

        const [usersRes, groupsRes, spRes] = await Promise.allSettled([
            fetch(`${baseUrl}${scimPath}/Users`, { headers }),
            fetch(`${baseUrl}${scimPath}/Groups`, { headers }),
            fetch(`${baseUrl}${scimPath}/ServicePrincipals`, { headers })
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
        const config = await StorageService.getResolvedConfig();
        if (config.ucAuthType !== 'ACCOUNT') return [];
        if (!config.ucAccountId) {
            console.warn("[UCIdentityService] ucAccountId is missing in ACCOUNT mode.");
            return [];
        }

        // Mock implementation for demo if no real credentials
        // In real impl, this would hit /api/2.0/accounts/{id}/workspaces
        console.log(`Fetching workspaces for Account ${config.ucAccountId}...`);

        // Return mock workspaces for now to demonstrate UI if no real fetch implemented yet?
        // NO, we want to try real fetch first as per plan.
        const token = await getM2MToken(config);
        if (!token) throw new Error("No M2M Token");

        const headers = { 'Authorization': `Bearer ${token}` };
        // Valid Endpoint: GET https://<host>/api/2.0/accounts/{account_id}/workspaces
        // User requested to use the "host_url" (interpreted as the configured host) instead of hardcoded hostname

        const baseUrl = getAccountBaseUrl(config);
        const workspacesUrl = `${baseUrl}/api/2.0/accounts/${config.ucAccountId}/workspaces`;

        console.log(`[UCIdentityService] Fetching Workspaces URL: ${workspacesUrl}`);

        const res = await fetch(workspacesUrl, { headers });
        if (!res.ok) {
            const errorBody = await res.text().catch(() => 'No body');
            console.error(`[UCIdentityService] Workspaces Fetch Failed. Status: ${res.status} ${res.statusText}, Body: ${errorBody}`);
            throw new Error(`Workspaces Fetch Failed: ${res.statusText}`);
        }

        const data = await res.json();
        console.log(`[UCIdentityService] Successfully fetched ${data.length || 0} workspaces.`);

        // Map to our format
        // Derive the domain from the baseUrl (e.g. cloud.databricks.com or azuredatabricks.net)
        const hostUrl = new URL(baseUrl);
        const domain = hostUrl.hostname.split('.').slice(1).join('.'); // takes "cloud.databricks.com" from "accounts.cloud.databricks.com"

        return (data.map(ws => ({
            id: ws.workspace_id,
            name: ws.workspace_name,
            url: `https://${ws.deployment_name}.${domain}` // Use derived domain
        })));

    } catch (error) {
        console.error("[UCIdentityService] Failed to fetch workspaces:", error);
        throw error; // Rethrow so the UI can catch it
    }
};

/**
 * Validates the current auth token for a host.
 * If invalid or simple reuse, fetches a new one via M2M.
 */
const getValidToken = async (host, config) => {
    // For now, we just use the global M2M token which is not host-specific in the current simple impl
    // but implies we are using the Account M2M creds for everything.
    // In a real scenario, we might need workspace-specific tokens or U2M tokens.
    // We will reuse the getM2MToken for simplicity as it uses the configured Client ID/Secret.
    // WARNING: This assumes the Service Principal has access to the target workspace.
    return await getM2MToken(config);
};

export const fetchCatalogs = async (workspaceUrl) => {
    try {
        const config = await StorageService.getResolvedConfig();
        const token = await getValidToken(workspaceUrl, config);

        if (!token) throw new Error("No valid token available");

        console.log(`Fetching catalogs from ${workspaceUrl}...`);

        // Proxy path construction:
        // Client -> Vite Proxy (/api/...) -> Target (workspaceUrl/api/...)
        // We need to route this request through our proxy if we are in dev mode.
        // Assuming the proxy setup handles the rewrites or we use the absolute URL if CORS allows (unlikely).
        // For the demo, we'll try to use the proxy path convention: /api/workspace-id/...
        // But since we don't have a dynamic proxy rewriter for arbitrary workspaces easily without backend,
        // we might have to rely on a fixed proxy or the 'host' being our proxy target.

        // LIMITATION: Vite proxy is static. We can't proxy to arbitrary dynamic workspace URLs easily.
        // WORKAROUND: We will assume the User has configured the proxy to point to the specific workspace 
        // OR we are running in an environment where we can hit it directly (e.g. Electron/Backend).
        //
        // FOR THIS DEMO: We will assume the `workspaceUrl` is actually just used for logging/context
        // and we will use the configured proxy target if it matches, or fail if we can't route.
        //
        // ACTUALLY: Let's assume we can use the /api/2.1/unity-catalog... directly if we are using the Account Console proxy?
        // No, workspace data is on the workspace.
        //
        // REVISED APPROACH FOR DEMO:
        // We will mock the deep fetch if we can't hit the real API, BUT we will implement the logic as if likely to work.
        // We will try to fetch from `${workspaceUrl}/api/2.1/unity-catalog/catalogs`.

        const headers = { 'Authorization': `Bearer ${token}` };
        const catalogsUrl = `${workspaceUrl}/api/2.1/unity-catalog/catalogs`;

        console.log(`[UCIdentityService] Fetching Catalogs URL: ${catalogsUrl}`);

        // 1. Fetch Catalogs
        // We use a helper to robustly fetch or return mock if actual network fails (CORS).
        const catalogsRes = await fetch(catalogsUrl, { headers }).catch(e => {
            console.error(`[UCIdentityService] Network error fetching catalogs from ${workspaceUrl}:`, e);
            return null;
        });

        if (!catalogsRes || !catalogsRes.ok) {
            const status = catalogsRes ? `${catalogsRes.status} ${catalogsRes.statusText}` : 'Network Error';
            console.warn(`[UCIdentityService] Failed to fetch catalogs from ${workspaceUrl} (${status}). Using Mock data for demo.`);
            return null;
        }

        const catalogsData = await catalogsRes.json();
        const catalogs = catalogsData.catalogs || [];
        console.log(`[UCIdentityService] Found ${catalogs.length} catalogs in ${workspaceUrl}.`);

        // 2. Build Tree (Parallel fetch for Schemas)
        const tree = await Promise.all(catalogs.map(async (cat) => {
            const catNode = {
                id: cat.name, // using name as ID for simplicity or cat.catalog_name
                name: cat.name,
                type: 'CATALOG',
                children: []
            };

            // Fetch Schemas for this Catalog
            const schemasRes = await fetch(`${workspaceUrl}/api/2.1/unity-catalog/schemas?catalog_name=${cat.name}`, { headers }).catch(() => null);
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

                    // Fetch Tables for this Schema
                    const tablesRes = await fetch(`${workspaceUrl}/api/2.1/unity-catalog/tables?catalog_name=${cat.name}&schema_name=${sch.name}`, { headers }).catch(() => null);
                    if (tablesRes && tablesRes.ok) {
                        const tablesData = await tablesRes.json();
                        const tables = tablesData.tables || [];
                        schNode.children = tables.map(tbl => ({
                            id: `${cat.name}.${sch.name}.${tbl.name}`,
                            name: tbl.name,
                            type: tbl.table_type === 'VIEW' ? 'VIEW' : 'TABLE',
                            parentId: schNode.id,
                            owners: [tbl.owner] // Simple owner mapping
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
