import { ICatalogAdapter } from '../ICatalogAdapter';
import { fetchWorkspaces, fetchCatalogs } from '../../UCIdentityService';
import { UnityCatalogAdapter as StorageUCAdapter } from '../../storage/adapters/UnityCatalogAdapter';

/**
 * Real Databricks Catalog Connectivity Adapter
 */
export const DatabricksCatalogAdapter = {
    ...ICatalogAdapter,
    name: 'Databricks UC',
    type: 'DATABRICKS',

    async fetchWorkspaces(config) {
        return await fetchWorkspaces();
    },

    async fetchCatalogs(workspaceUrl, config) {
        return await fetchCatalogs(workspaceUrl); // This is the fetchCatalogs from UCIdentityService
    },

    async getLiveGrants(object, config) {
        // Reuse logic from storage adapter if it exists there
        if (StorageUCAdapter && StorageUCAdapter.getLiveGrants) {
            return await StorageUCAdapter.getLiveGrants(object, config);
        }
        return [];
    }
};
