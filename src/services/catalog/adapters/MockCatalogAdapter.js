import { ICatalogAdapter } from '../ICatalogAdapter';
import { MOCK_CATALOGS } from '../../mockData';

const MOCK_ACCOUNT_CATALOGS = [
    {
        id: 'acc_root',
        name: 'Databricks Account',
        type: 'ACCOUNT_ROOT',
        children: [
            { id: 'ws_prod', name: 'Prod Workspace', type: 'WORKSPACE' },
            { id: 'ws_dev', name: 'Dev Workspace', type: 'WORKSPACE' },
            { id: 'ws_staging', name: 'Staging Workspace', type: 'WORKSPACE' },
        ]
    }
];

export const MockCatalogAdapter = {
    ...ICatalogAdapter,
    name: 'Mock Catalog',
    type: 'MOCK',

    async fetchWorkspaces(config) {
        return [
            { id: 'ws_prod', name: 'Prod Workspace', url: 'https://prod.cloud.databricks.com' },
            { id: 'ws_dev', name: 'Dev Workspace', url: 'https://dev.cloud.databricks.com' }
        ];
    },

    async fetchCatalogs(workspaceUrl, config) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_CATALOGS;
    },

    async getLiveGrants(object, config) {
        return [];
    }
};
