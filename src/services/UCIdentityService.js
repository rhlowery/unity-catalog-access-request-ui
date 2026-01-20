/**
 * Service to fetch identities (Users, Groups, Service Principals) 
 * from Unity Catalog (Databricks) via SCIM APIs.
 * 
 * Requires Vite Proxy configuration to handle CORS.
 */

const API_BASE = '/api/2.0/preview/scim/v2';

export const fetchUCIdentities = async () => {
    try {
        console.log("Fetching identities from Unity Catalog...");

        const [usersRes, groupsRes, spRes] = await Promise.allSettled([
            fetch(`${API_BASE}/Users`),
            fetch(`${API_BASE}/Groups`),
            fetch(`${API_BASE}/ServicePrincipals`)
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
