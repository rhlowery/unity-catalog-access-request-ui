/**
 * Service to fetch identities (Users, Groups, Service Principals) 
 * from Unity Catalog (Databricks) via SCIM APIs.
 * 
 * Requires Vite Proxy configuration to handle CORS.
 */

import { StorageService } from './storage/StorageService';
import { ConfigService } from './config/ConfigService';
import { SecretsService } from './secrets/SecretsService';

import { apiClient } from '../lib/axios';

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
        // Security: We send host, clientId, and clientSecret. The BFF converts these into an HttpOnly cookie.
        await apiClient.post('/api/token', {
            host: host,
            clientId: config.ucClientId,
            clientSecret: clientSecret
        });

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

        const bffHeaders = { 'x-scim-host': new URL(baseUrl).hostname };

        const [usersRes, groupsRes, spRes] = await Promise.allSettled([
            apiClient.get(`/api/scim${scimPath}/Users`, { headers: bffHeaders }),
            apiClient.get(`/api/scim${scimPath}/Groups`, { headers: bffHeaders }),
            apiClient.get(`/api/scim${scimPath}/ServicePrincipals`, { headers: bffHeaders })
        ]);

        const users = usersRes.status === 'fulfilled' ? usersRes.value.data : { Resources: [] };
        const groups = groupsRes.status === 'fulfilled' ? groupsRes.value.data : { Resources: [] };
        const sps = spRes.status === 'fulfilled' ? spRes.value.data : { Resources: [] };

        // Normalize Data
        const normalizedUsers = (users.Resources || []).map((u: any) => ({
            id: u.id,
            name: u.userName || u.displayName,
            email: u.userName,
            type: 'USER'
        }));

        const normalizedGroups = (groups.Resources || []).map((g: any) => ({
            id: g.id,
            name: g.displayName,
            type: 'GROUP'
        }));

        const normalizedSPs = (sps.Resources || []).map((sp: any) => ({
            id: sp.id,
            name: sp.displayName || sp.applicationId,
            type: 'SERVICE_PRINCIPAL'
        }));

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

        // Route through BFF /api/uc proxy
        const workspacesUrl = `/api/uc/api/2.0/accounts/${config.ucAccountId}/workspaces`;

        console.log(`[UCIdentityService] Fetching Workspaces via BFF: ${workspacesUrl}`);

        const res = await apiClient.get(workspacesUrl, {
            headers: { 'x-workspace-host': workspaceHost }
        });

        const data = res.data;
        console.log(`[UCIdentityService] Successfully fetched ${data.length || 0} workspaces.`);

        const hostUrl = new URL(baseUrl);
        const domain = hostUrl.hostname.split('.').slice(1).join('.');

        return (data.map((ws: any) => ({
            id: ws.workspace_id,
            name: ws.workspace_name,
            url: `https://${ws.deployment_name}.${domain}`
        })));

    } catch (error) {
        console.error("[UCIdentityService] Failed to fetch workspaces:", error);
        throw error;
    }
};

/**
 * Fetch top-level Catalogs only (for lazy loading).
 */
export const fetchCatalogs = async (workspaceUrl: string) => {
    try {
        const config = await ConfigService.getResolvedConfig();
        await getM2MToken(config);

        const workspaceHost = new URL(workspaceUrl).hostname;
        const bffHeaders = { 'x-workspace-host': workspaceHost };

        console.log(`[UCIdentityService] Fetching top-level catalogs for ${workspaceHost}...`);

        const res = await apiClient.get('/api/sdk/catalogs', {
            headers: bffHeaders
        });

        const catalogs = res.data.catalogs || [];
        return catalogs.map((cat: any) => ({
            id: cat.name,
            name: cat.name,
            type: 'CATALOG' as const,
            hasChildren: true, // Optimistically assume schemas exist
            children: []
        }));
    } catch (e) {
        console.error("[UCIdentityService] Failed to fetch catalogs:", e);
        return null;
    }
};

/**
 * Fetch Schemas for a specific Catalog (with pagination support).
 */
export const fetchSchemas = async (workspaceUrl: string, catalogName: string, pageToken?: string) => {
    try {
        const workspaceHost = new URL(workspaceUrl).hostname;
        const bffHeaders = { 'x-workspace-host': workspaceHost };

        const res = await apiClient.get(`/api/sdk/schemas`, {
            headers: bffHeaders,
            params: { catalog_name: catalogName, page_token: pageToken }
        });

        const schemas = res.data.schemas || [];
        return {
            items: schemas.map((sch: any) => ({
                id: `${catalogName}.${sch.name}`,
                name: sch.name,
                type: 'SCHEMA' as const,
                parentId: catalogName,
                hasChildren: true,
                children: []
            })),
            nextPageToken: res.data.next_page_token
        };
    } catch (e) {
        console.error(`[UCIdentityService] Failed to fetch schemas for ${catalogName}:`, e);
        return { items: [] };
    }
};

/**
 * Fetch Tables for a specific Schema (with pagination support).
 */
export const fetchTables = async (workspaceUrl: string, catalogName: string, schemaName: string, pageToken?: string) => {
    try {
        const workspaceHost = new URL(workspaceUrl).hostname;
        const bffHeaders = { 'x-workspace-host': workspaceHost };

        const res = await apiClient.get(`/api/sdk/tables`, {
            headers: bffHeaders,
            params: { catalog_name: catalogName, schema_name: schemaName, page_token: pageToken }
        });

        const tables = res.data.tables || [];
        return {
            items: tables.map((tbl: any) => ({
                id: `${catalogName}.${schemaName}.${tbl.name}`,
                name: tbl.name,
                type: (tbl.table_type === 'VIEW' ? 'VIEW' : 'TABLE') as any,
                parentId: `${catalogName}.${schemaName}`,
                owners: [tbl.owner]
            })),
            nextPageToken: res.data.next_page_token
        };
    } catch (e) {
        console.error(`[UCIdentityService] Failed to fetch tables for ${schemaName}:`, e);
        return { items: [] };
    }
};

/**
 * Global search across catalogs/schemas/tables.
 */
export const searchCatalog = async (workspaceUrl: string, query: string) => {
    try {
        const workspaceHost = new URL(workspaceUrl).hostname;
        const bffHeaders = { 'x-workspace-host': workspaceHost };

        const res = await apiClient.get('/api/catalog/search', {
            headers: bffHeaders,
            params: { query }
        });

        return res.data.results || [];
    } catch (e) {
        console.error("[UCIdentityService] Search failed:", e);
        return [];
    }
};

/**
 * Fetch the current user profile from Databricks SCIM /Me.
 */
export const fetchMe = async () => {
    try {
        const config = await ConfigService.getResolvedConfig();
        await getM2MToken(config);

        const baseUrl = getAccountBaseUrl(config);
        const host = new URL(baseUrl).hostname;

        // SCIM /Me is workspace-level. If host specified, use it.
        const scimHost = config.ucHost || host;

        console.log(`[UCIdentityService] Fetching /Me from ${scimHost}...`);

        const res = await apiClient.get(`/api/scim/api/2.0/preview/scim/v2/Me`, {
            headers: { 'x-scim-host': scimHost }
        });

        const u = res.data;
        return {
            id: u.id,
            name: u.displayName || u.userName,
            email: u.emails?.[0]?.value || u.userName,
            type: 'USER',
            initials: (u.displayName || u.userName || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            provider: 'Databricks',
            groups: (u.groups || []).map((g: any) => g.display)
        };
    } catch (e) {
        console.error("[UCIdentityService] fetchMe failed:", e);
        return null;
    }
};
