import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { UnityCatalogAdapter } from './adapters/UnityCatalogAdapter';
import { RDBMSAdapter } from './adapters/RDBMSAdapter';
import { GitAdapter } from './adapters/GitAdapter';
import { VolatileAdapter } from './adapters/VolatileAdapter';

const ADAPTERS = {
    'LOCAL': LocalStorageAdapter,
    'UNITY_CATALOG': UnityCatalogAdapter,
    'RDBMS': RDBMSAdapter,
    'GIT': GitAdapter,
    'MOCK': VolatileAdapter
};

const CONFIG_KEY = 'acs_storage_config_v1';

// Default Config
const DEFAULT_CONFIG = {
    type: 'LOCAL',
    // UC Storage Config
    ucCatalog: 'main',
    ucSchema: 'analytics',
    ucTable: 'access_audit_log',

    // RDBMS Config
    rdbmsConn: 'jdbc:postgresql://localhost:5432/access_db',
    rdbmsUser: 'admin',
    rdbmsPassword: '',
    rdbmsPasswordSource: 'PLAIN', // PLAIN, VAULTED
    rdbmsPasswordVaultKey: 'database_password',

    // Git Config
    gitProvider: 'GITHUB',
    gitHost: 'github.com',
    gitRepo: 'org/repo',
    gitBranch: 'main',
    gitToken: '',
    gitTokenSource: 'PLAIN', // PLAIN, VAULTED
    gitTokenVaultKey: 'git_token',

    // Identity Provider
    identityType: 'OAUTH',
    scimEnabled: false,
    azureTenantId: '',
    samlSsoUrl: '',
    samlCert: '',
    samlCertSource: 'PLAIN', // PLAIN, VAULTED
    samlCertVaultKey: 'saml_cert',
    scimUrl: '',
    scimToken: '',
    scimTokenSource: 'PLAIN', // PLAIN, VAULTED
    scimTokenVaultKey: 'scim_token',
    oauthClientId: '',
    oauthClientSecret: '',
    oauthClientSecretSource: 'PLAIN', // PLAIN, VAULTED
    oauthClientSecretVaultKey: 'identity_client_secret',
    oauthAuthUrl: '',
    oauthTokenUrl: '',

    // Unity Catalog Global
    ucAuthType: 'WORKSPACE',
    ucAccountId: '',
    ucHost: '',
    ucClientId: '',
    ucClientSecret: '',
    ucClientSecretSource: 'PLAIN', // PLAIN, VAULTED
    ucClientSecretVaultKey: 'client_secret',
    ucCloudProvider: 'AWS',
    ucWorkspaceName: '',

    // Global Secret Management
    globalSecretProvider: 'PLAIN', // PLAIN, VAULT, MOCK_VAULT
    vaultUrl: '',
    vaultToken: '',
    vaultNamespace: '',
    vaultSecretPath: 'secret/data/uc-access-app'
};

export const StorageService = {
    getConfig() {
        const stored = localStorage.getItem(CONFIG_KEY);
        // Migration: map old ucClientSecretSource to globalSecretProvider if it's a provider type
        let config = stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
        if (['VAULT', 'MOCK_VAULT'].includes(config.ucClientSecretSource)) {
            config.globalSecretProvider = config.ucClientSecretSource;
            config.ucClientSecretSource = 'VAULTED';
        }
        return config;
    },

    saveConfig(config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    },

    async getResolvedConfig() {
        const config = this.getConfig();
        const { SecretsService } = await import('../secrets/SecretsService');

        let resolvedConfig = { ...config };

        // Resolve RDBMS Password
        if (config.rdbmsPasswordSource === 'VAULTED') {
            resolvedConfig.rdbmsPassword = await SecretsService.resolveSecret(
                config.vaultSecretPath,
                config.rdbmsPasswordVaultKey,
                config.rdbmsPassword
            );
        }

        // Resolve UC Client Secret
        if (config.ucClientSecretSource === 'VAULTED') {
            resolvedConfig.ucClientSecret = await SecretsService.resolveSecret(
                config.vaultSecretPath,
                config.ucClientSecretVaultKey,
                config.ucClientSecret
            );
        }

        // Resolve Git Token
        if (config.gitTokenSource === 'VAULTED') {
            resolvedConfig.gitToken = await SecretsService.resolveSecret(
                config.vaultSecretPath,
                config.gitTokenVaultKey,
                config.gitToken
            );
        }

        // Resolve SAML Cert
        if (config.samlCertSource === 'VAULTED') {
            resolvedConfig.samlCert = await SecretsService.resolveSecret(
                config.vaultSecretPath,
                config.samlCertVaultKey,
                config.samlCert
            );
        }

        // Resolve SCIM Token
        if (config.scimTokenSource === 'VAULTED') {
            resolvedConfig.scimToken = await SecretsService.resolveSecret(
                config.vaultSecretPath,
                config.scimTokenVaultKey,
                config.scimToken
            );
        }

        // Resolve OAuth Client Secret
        if (config.oauthClientSecretSource === 'VAULTED') {
            resolvedConfig.oauthClientSecret = await SecretsService.resolveSecret(
                config.vaultSecretPath,
                config.oauthClientSecretVaultKey,
                config.oauthClientSecret
            );
        }

        return resolvedConfig;
    },

    getAdapter() {
        const config = this.getConfig();
        return ADAPTERS[config.type] || LocalStorageAdapter;
    },

    async loadRequests() {
        const adapter = this.getAdapter();
        const config = await this.getResolvedConfig();
        console.log(`[StorageService] Loading using ${adapter.name}`);
        return await adapter.load(config);
    },

    async saveRequests(data) {
        const adapter = this.getAdapter();
        const config = await this.getResolvedConfig();
        console.log(`[StorageService] Saving all using ${adapter.name}`);
        return await adapter.save(data, config);
    },

    async upsertRequest(request) {
        const adapter = this.getAdapter();
        const config = await this.getResolvedConfig();
        console.log(`[StorageService] Upserting request ${request.id} using ${adapter.name}`);
        if (adapter.upsertRequest) {
            return await adapter.upsertRequest(request, config);
        } else {
            const all = await adapter.load(config);
            const index = all.findIndex(r => r.id === request.id);
            if (index !== -1) all[index] = request;
            else all.push(request);
            return await adapter.save(all, config);
        }
    },

    async getGrants(object) {
        const adapter = this.getAdapter();
        const config = await this.getResolvedConfig();
        if (adapter.getGrants) {
            return await adapter.getGrants(object, config);
        }
        return [];
    }
};
