/**
 * Unity Catalog Storage Adapter
 * Stores requests as rows in a specific UC Table.
 * Uses SCIM/REST APIs to insert/query data.
 * 
 * Config requires: catalog, schema, table
 */
export const UnityCatalogAdapter = {
    name: 'Unity Catalog Table',
    type: 'UNITY_CATALOG',

    async load(config) {
        // Mock Implementation until real API endpoints are verified
        // In reality: Fetch from /api/2.1/unity-catalog/tables/.../query
        console.log(`[UC Adapter] Fetching from ${config.catalog}.${config.schema}.${config.table}`);

        // Return mock empty or cached data for now to prevent crashing
        return [];
    },

    async save(data, config) {
        // In reality: INSERT/MERGE into delta table
        console.log(`[UC Adapter] Saving ${data.length} records to Delta Table`);
        return true;
    },

    async getGrants(object, config) {
        // For UC-backed storage of requests
        // Since load() returns empty array in this mock, we just return empty
        return [];
    },

    async getLiveGrants(object, config) {
        // This simulates the ACTUAL permissions on the object in Unity Catalog
        console.log(`[UC Adapter] Fetching LIVE GRANTS for ${object.name}`);

        // Default: No grants
        const grants = [];

        // MOCK SCENARIO 1: "Configured but Not Applied"
        // (Handled by having a request in LocalStorage but nothing here)

        // MOCK SCENARIO 2: "Not Recorded" (Red)
        // We simulate that 'tbl_transactions' has a grant that was made out-of-band (manually in UC console)
        if (object.name === 'transactions') {
            grants.push({
                principal: { id: 'user_cfo', name: 'Carol CFO', type: 'USER' },
                permissions: ['ALL_PRIVILEGES'],
                source: 'LIVE',
                type: 'DIRECT'
            });
            grants.push({
                principal: { id: 'group_finance_admins', name: 'Finance Admins', type: 'GROUP' },
                permissions: ['SELECT', 'MODIFY'],
                source: 'LIVE',
                type: 'DIRECT'
            });
        }

        // Mock: Add specific grant for "marketing" schema
        if (object.name === 'marketing') {
            grants.push({
                principal: { id: 'user_marketing_lead', name: 'Mike Marketing', type: 'USER' },
                permissions: ['USE_SCHEMA'],
                source: 'LIVE',
                type: 'DIRECT'
            });
        }

        return grants;
    }
};
