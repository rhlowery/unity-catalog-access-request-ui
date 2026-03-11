import { ICatalogAdapter, Workspace, CatalogNode } from '../ICatalogAdapter';
import { MOCK_CATALOGS } from '../../mockData';

const MOCK_ACCOUNT_CATALOGS: CatalogNode[] = [
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

export const MockCatalogAdapter: ICatalogAdapter = {
    name: 'Mock Catalog',
    type: 'MOCK',

    async fetchWorkspaces(config: any): Promise<Workspace[]> {
        return [
            { id: 'ws_prod', name: 'Prod Workspace', url: 'https://prod.cloud.databricks.com' },
            { id: 'ws_dev', name: 'Dev Workspace', url: 'https://dev.cloud.databricks.com' }
        ];
    },

    async fetchCatalogs(workspaceUrl: string): Promise<CatalogNode[]> {
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_CATALOGS;
    },

    async getLiveGrants(object: any, config: any): Promise<any[]> {
        const objectId = object?.id || object?.name || String(object);

        // Return mock live grants based on the object ID/name
        if (objectId.includes('transactions')) {
            return [
                { principal: 'group_finance_admins', permissions: ['ALL_PRIVILEGES'], inherited_from: 'catalog' }
            ];
        } else if (objectId.includes('employees')) {
            return [
                { principal: 'group_hr_admins', permissions: ['SELECT', 'MODIFY'], inherited_from: 'schema' }
            ];
        } else if (objectId.includes('credit_scores')) {
            return [
                { principal: 'group_risk_analysts', permissions: ['SELECT'], inherited_from: 'table' }
            ];
        }

        return [];
    },

    async searchCatalog(workspaceUrl: string, query: string): Promise<any[]> {
        const results: any[] = [];
        const lowerQuery = query.toLowerCase();

        const searchNodes = (nodes: any[], catalogName?: string, schemaName?: string) => {
            for (const node of nodes) {
                const currentCatalog = node.type === 'CATALOG' ? node.name : catalogName;
                const currentSchema = node.type === 'SCHEMA' ? node.name : schemaName;

                if (node.type !== 'CATALOG' && node.type !== 'SCHEMA') {
                    if (node.name.toLowerCase().includes(lowerQuery)) {
                        results.push({
                            name: node.name,
                            table_type: node.type,
                            catalog_name: currentCatalog,
                            schema_name: currentSchema
                        });
                    }
                }

                if (node.children) {
                    searchNodes(node.children, currentCatalog, currentSchema);
                }
            }
        };

        searchNodes(MOCK_CATALOGS);
        return results;
    },

    async fetchSchemas(workspaceUrl: string, catalogName: string): Promise<{ items: CatalogNode[] }> {
        const catalog = MOCK_CATALOGS.find(c => c.name === catalogName);
        return { items: catalog?.children || [] };
    },

    async fetchTables(workspaceUrl: string, catalogName: string, schemaName: string): Promise<{ items: CatalogNode[] }> {
        const catalog = MOCK_CATALOGS.find(c => c.name === catalogName);
        const schema = catalog?.children?.find(s => s.name === schemaName);
        return { items: (schema as any)?.children || [] };
    }
};
