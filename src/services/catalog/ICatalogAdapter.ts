/**
 * Interface for Catalog Connectivity Adapters.
 * Handles fetching of workspaces, catalogs, schemas, and tables.
 */
export interface ICatalogAdapter {
    name: string;
    type: string;

    /**
     * Fetches available workspaces (if applicable).
     * @param config - The global app configuration.
     * @returns List of workspaces.
     */
    fetchWorkspaces(config: any): Promise<Workspace[]>;

    /**
     * Fetches top-level catalogs.
     */
    fetchCatalogs(workspaceUrl: string): Promise<CatalogNode[]>;

    /**
     * Fetches schemas for a catalog.
     */
    fetchSchemas?(workspaceUrl: string, catalogName: string): Promise<{ items: CatalogNode[], nextPageToken?: string }>;

    /**
     * Fetches tables for a schema.
     */
    fetchTables?(workspaceUrl: string, catalogName: string, schemaName: string): Promise<{ items: CatalogNode[], nextPageToken?: string }>;

    /**
     * Searches for objects.
     */
    searchCatalog?(workspaceUrl: string, query: string): Promise<any[]>;

    /**
     * Fetches live grants for an object directly from catalog.
     * @param object - The object to check.
     * @param config - The global app configuration.
     * @returns List of live grants.
     */
    getLiveGrants(object: any, config: any): Promise<any[]>;
}

export interface Workspace {
    id: string;
    name: string;
    url?: string;
    [key: string]: any;
}

export interface CatalogNode {
    id: string;
    name: string;
    type: string; // More flexible to match mock data
    children?: CatalogNode[];
    parentId?: string;
    owners?: string[];
    catalog?: string;
    schema?: string;
    [key: string]: any;
}
