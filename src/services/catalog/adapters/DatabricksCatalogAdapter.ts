import { ICatalogAdapter } from '../ICatalogAdapter';
import { fetchWorkspaces, fetchCatalogs, fetchSchemas, fetchTables, searchCatalog } from '../../UCIdentityService';
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

    async fetchCatalogs(workspaceUrl: string) {
        return await fetchCatalogs(workspaceUrl);
    },

    async fetchSchemas(workspaceUrl: string, catalogName: string) {
        return await fetchSchemas(workspaceUrl, catalogName);
    },

    async fetchTables(workspaceUrl: string, catalogName: string, schemaName: string) {
        return await fetchTables(workspaceUrl, catalogName, schemaName);
    },

    async searchCatalog(workspaceUrl: string, query: string) {
        return await searchCatalog(workspaceUrl, query);
    },

    async getLiveGrants(_object: any, _config: any) {
        // Reuse logic from storage adapter if it exists there
        if (StorageUCAdapter && (StorageUCAdapter as any).getLiveGrants) {
            return await (StorageUCAdapter as any).getLiveGrants(_object, _config);
        }
        return [];
    }
};
