/**
 * Interface for Storage Adapters.
 * All storage adapters must implement these methods.
 */
export interface IStorageAdapter {
    name: string;
    type: string;

    /**
     * Loads all requests.
     * @param config - The global app configuration.
     * @returns List of requests.
     */
    load(config: StorageConfig): Promise<AccessRequest[]>;

    /**
     * Saves all requests.
     * @param data - All requests to save.
     * @param config - The global app configuration.
     * @returns Success status.
     */
    save(data: AccessRequest[], config: StorageConfig): Promise<boolean>;

    /**
     * Upserts a single request.
     * @param request - The request to upsert.
     * @param config - The global app configuration.
     * @returns Success status.
     */
    upsertRequest(request: AccessRequest, config: StorageConfig): Promise<boolean>;

    /**
     * Gets approved grants for a specific object.
     * @param object - The object (catalog/schema/table).
     * @param config - The global app configuration.
     * @returns List of grants.
     */
    getGrants(object: CatalogObject, config: StorageConfig): Promise<Grant[]>;
}

// Type definitions for better type safety
export interface StorageConfig {
    type: string;
    ucCatalog?: string;
    ucSchema?: string;
    ucTable?: string;
    rdbmsConn?: string;
    rdbmsUser?: string;
    rdbmsPassword?: string;
    rdbmsPasswordSource?: string;
    rdbmsPasswordVaultKey?: string;
    gitProvider?: string;
    gitHost?: string;
    gitRepo?: string;
    gitBranch?: string;
    gitToken?: string;
    gitTokenSource?: string;
    gitTokenVaultKey?: string;
    identityType?: string;
    scimEnabled?: boolean;
    azureTenantId?: string;
    samlSsoUrl?: string;
    samlCert?: string;
    samlCertSource?: string;
    samlCertVaultKey?: string;
    scimUrl?: string;
    scimToken?: string;
    scimTokenSource?: string;
    scimTokenVaultKey?: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthClientSecretSource?: string;
    oauthClientSecretVaultKey?: string;
    oauthAuthUrl?: string;
    oauthTokenUrl?: string;
    ucAuthType?: string;
    ucAccountId?: string;
    ucHost?: string;
    ucClientId?: string;
    ucClientSecret?: string;
    ucClientSecretSource?: string;
    ucClientSecretVaultKey?: string;
    ucCloudProvider?: string;
    ucWorkspaceName?: string;
    globalSecretProvider?: string;
    vaultUrl?: string;
    vaultToken?: string;
    vaultNamespace?: string;
    vaultSecretPath?: string;
}

export interface AccessRequest {
    id: string;
    // Add other access request properties
    [key: string]: any;
}

export interface Grant {
    id: string;
    principal: string;
    privileges: string[];
    object: CatalogObject;
    // Add other grant properties
    [key: string]: any;
}

export interface CatalogObject {
    id: string;
    name: string;
    type: 'CATALOG' | 'SCHEMA' | 'TABLE' | 'VIEW' | 'MODEL' | 'FUNCTION' | 'VOLUME' | 'LOCATION' | 'CREDENTIAL' | 'COMPUTE';
    catalog?: string;
    schema?: string;
    table?: string;
    [key: string]: any;
}
