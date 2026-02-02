import { ICatalogAdapter } from '../ICatalogAdapter';
import { fetchWorkspaces, fetchCatalogs } from '../../UCIdentityService';
import { UnityCatalogAdapter as StorageUCAdapter } from '../../storage/adapters/UnityCatalogAdapter';

/**
 * Real Databricks Catalog Connectivity Adapter
 */
export const DatabricksCatalogAdapter: ICatalogAdapter = {
    name: 'Databricks UC',
    type: 'DATABRICKS',

    async fetchWorkspaces(config: any) {
        if (config.ucAuthType === 'WORKSPACE') {
            const host = config.ucHost || 'primary-workspace';
            const derivedName = host.replace(/^https?:\/\//, '').split('.')[0] || 'Primary Workspace';
            const name = config.ucWorkspaceName || (derivedName.charAt(0).toUpperCase() + derivedName.slice(1));
            return [
                { id: 'ws_single', name, url: host.startsWith('http') ? host : `https://${host}` }
            ];
        }
        return await fetchWorkspaces();
    },

    async fetchCatalogs(workspaceUrl, _config) {
        return await fetchCatalogs(workspaceUrl); // This is the fetchCatalogs from UCIdentityService
    },

    async getLiveGrants(_object, _config) {
        // Reuse logic from storage adapter if it exists there
        if (StorageUCAdapter && StorageUCAdapter.getLiveGrants) {
            return await StorageUCAdapter.getLiveGrants(_object, _config);
        }
        return [];
    }
};
