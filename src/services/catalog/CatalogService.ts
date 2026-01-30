import { StorageService } from '../storage/StorageService';
import { MockCatalogAdapter } from './adapters/MockCatalogAdapter';
import { DatabricksCatalogAdapter } from './adapters/DatabricksCatalogAdapter';

const ADAPTERS = {
    'MOCK': MockCatalogAdapter,
    'DATABRICKS': DatabricksCatalogAdapter,
};

export const CatalogService = {
    getAdapter() {
        const config = StorageService.getConfig();
        // Determine mode based on ucAuthType
        let type = 'MOCK';
        if (config.ucAuthType === 'ACCOUNT' || config.ucAuthType === 'WORKSPACE') {
            type = 'DATABRICKS';
        }

        return ADAPTERS[type] || MockCatalogAdapter;
    },

    async fetchWorkspaces() {
        const adapter = this.getAdapter();
        const config = StorageService.getConfig();
        console.log(`[CatalogService] Fetching workspaces using ${adapter.name}`);
        return await adapter.fetchWorkspaces(config);
    },

    async fetchCatalogs(workspaceUrl) {
        const adapter = this.getAdapter();
        const config = StorageService.getConfig();
        console.log(`[CatalogService] Fetching catalogs using ${adapter.name} for ${workspaceUrl}`);
        return await adapter.fetchCatalogs(workspaceUrl, config);
    },

    async getLiveGrants(object) {
        const adapter = this.getAdapter();
        const config = StorageService.getConfig();
        return await adapter.getLiveGrants(object, config);
    }
};
