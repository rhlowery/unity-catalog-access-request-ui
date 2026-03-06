import { StorageService } from '../storage/StorageService';
import { ConfigService } from '../config/ConfigService';
import { MockCatalogAdapter } from './adapters/MockCatalogAdapter';
import { DatabricksCatalogAdapter } from './adapters/DatabricksCatalogAdapter';

const ADAPTERS = {
    'MOCK': MockCatalogAdapter,
    'DATABRICKS': DatabricksCatalogAdapter,
};

export const CatalogService = {
    getAdapter() {
        const config = ConfigService.getConfig();
        // Determine mode based on ucAuthType
        let type = 'MOCK';
        if (config.ucAuthType === 'ACCOUNT' || config.ucAuthType === 'WORKSPACE') {
            type = 'DATABRICKS';
        }

        return ADAPTERS[type] || MockCatalogAdapter;
    },

    async fetchWorkspaces() {
        const adapter = this.getAdapter();
        const config = ConfigService.getConfig();
        console.log(`[CatalogService] Fetching workspaces using ${adapter.name}`);
        return await adapter.fetchWorkspaces(config);
    },

    async fetchCatalogs(workspaceUrl: string) {
        const adapter = this.getAdapter();
        console.log(`[CatalogService] Fetching catalogs using ${adapter.name} for ${workspaceUrl}`);
        return await adapter.fetchCatalogs(workspaceUrl);
    },

    async fetchSchemas(workspaceUrl: string, catalogName: string) {
        const adapter = this.getAdapter();
        if (adapter.fetchSchemas) {
            return await adapter.fetchSchemas(workspaceUrl, catalogName);
        }
        return { items: [] };
    },

    async fetchTables(workspaceUrl: string, catalogName: string, schemaName: string) {
        const adapter = this.getAdapter();
        if (adapter.fetchTables) {
            return await adapter.fetchTables(workspaceUrl, catalogName, schemaName);
        }
        return { items: [] };
    },

    async searchCatalog(workspaceUrl: string, query: string) {
        const adapter = this.getAdapter();
        if (adapter.searchCatalog) {
            return await adapter.searchCatalog(workspaceUrl, query);
        }
        return [];
    },

    async getLiveGrants(object: any) {
        const adapter = this.getAdapter();
        const config = ConfigService.getConfig();
        return await adapter.getLiveGrants(object, config);
    }
};
