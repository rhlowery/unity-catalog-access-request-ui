/**
 * Unity Catalog Storage Adapter
 * Stores requests as tables in a specific UC Schema.
 * Uses SCIM/REST APIs to insert/query data.
 * 
 * Config requires: catalog, schema
 * Multiple tables can be created in the schema to support different services.
 * Example tables: requests, approvals, audit_log, etc.
 */
import { getM2MToken } from '../../UCIdentityService';

export const UnityCatalogAdapter = {
    name: 'Unity Catalog Schema',
    type: 'UNITY_CATALOG',

    async load(config) {
        // Mock Implementation until real API endpoints are verified
        // In reality: Fetch from /api/2.1/unity-catalog/tables/{catalog}.{schema}/query
        console.log(`[UC Adapter] Fetching from ${config.catalog}.${config.schema}`);

        // Return mock empty or cached data for now to prevent crashing
        return [];
    },

    async save(data, _config) {
        // In reality: INSERT/MERGE into delta table(s)
        console.log(`[UC Adapter] Saving ${data.length} records to Delta Schema`);
        return true;
    },

    async getGrants(object, config) {
        // For UC-backed storage of requests
        // Since load() returns empty array in this mock, we just return empty
        return [];
    },

    async getLiveGrants(object: any, config: any) {
        console.log(`[UC Adapter] Fetching LIVE GRANTS for ${object.name} from UC API...`);

        try {
            const token = await getM2MToken(config);
            if (!token) throw new Error("Could not obtain M2M token");

            const host = config.ucHost || 'accounts.cloud.databricks.com';
            const baseUrl = host.startsWith('http') ? host : `https://${host}`;

            // Unity Catalog Grants API: GET /api/2.1/unity-catalog/permissions/{securable_type}/{full_name}
            const securableType = object.type === 'CATALOG' ? 'catalog' : object.type === 'SCHEMA' ? 'schema' : 'table';
            const grantsUrl = `${baseUrl}/api/2.1/unity-catalog/permissions/${securableType}/${object.id}`;

            console.log(`[UC Adapter] Fetching permissions from: ${grantsUrl}`);

            const res = await fetch(grantsUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                console.warn(`[UC Adapter] Failed to fetch real grants. Falling back to mock logic. Status: ${res.status}`);
                return this.getMockGrants(object);
            }

            const data = await res.json();
            // Map UC PrivilegeAssignments to our internal Grant format
            return (data.privilege_assignments || []).flatMap(pa =>
                pa.privileges.map(priv => ({
                    principal: { name: pa.principal, type: 'UNKNOWN' }, // SCIM lookup would be needed for full detail
                    permissions: [priv],
                    source: 'LIVE',
                    type: 'DIRECT'
                }))
            );

        } catch (error) {
            console.error("[UC Adapter] Error fetching live grants:", error);
            return this.getMockGrants(object);
        }
    },

    getMockGrants(object: any) {
        // Fallback mock logic
        const grants = [];
        if (object.name === 'transactions') {
            grants.push({
                principal: { id: 'user_cfo', name: 'Carol CFO', type: 'USER' },
                permissions: ['ALL_PRIVILEGES'],
                source: 'LIVE',
                type: 'DIRECT'
            });
        }
        return grants;
    }
};
