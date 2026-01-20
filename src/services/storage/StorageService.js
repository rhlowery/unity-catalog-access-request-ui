import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { UnityCatalogAdapter } from './adapters/UnityCatalogAdapter';
import { RDBMSAdapter } from './adapters/RDBMSAdapter';
import { GitAdapter } from './adapters/GitAdapter';

const ADAPTERS = {
    'LOCAL': LocalStorageAdapter,
    'UNITY_CATALOG': UnityCatalogAdapter,
    'RDBMS': RDBMSAdapter,
    'GIT': GitAdapter
};

const CONFIG_KEY = 'acs_storage_config_v1';

// Default Config
const DEFAULT_CONFIG = {
    type: 'LOCAL',
    // UC Config
    ucCatalog: 'main',
    ucSchema: 'analytics',
    ucTable: 'access_audit_log',
    // RDBMS Config
    rdbmsConn: 'jdbc:postgresql://localhost:5432/access_db',
    rdbmsUser: 'admin',
    // Git Config
    gitProvider: 'GITHUB', // GITHUB, GITLAB, GITLAB_SELF_HOSTED
    gitHost: 'github.com',
    gitRepo: 'org/repo', // Normalized label
    gitBranch: 'main',

    // Identity Provider (SSO/SCIM/OAuth)
    identityType: 'OAUTH', // OAUTH, AZURE, or SAML
    scimEnabled: false,
    azureTenantId: '',
    samlSsoUrl: '',
    samlCert: '',
    scimUrl: '',
    scimToken: '',
    oauthClientId: '',
    oauthClientSecret: '',
    oauthAuthUrl: '',
    oauthTokenUrl: '',

    // Unity Catalog Global
    ucAuthType: 'WORKSPACE', // WORKSPACE or ACCOUNT
    ucAccountId: '',
    ucHost: '',
    ucClientId: '',
    ucClientSecret: '', // Used if Source is PLAIN
    ucClientSecretSource: 'PLAIN', // PLAIN or VAULT
    ucClientSecretVaultPath: '',
    ucClientSecretVaultKey: '',

    // Vault Config
    vaultUrl: '',
    vaultToken: '',
    vaultNamespace: ''
};

export const StorageService = {
    getConfig() {
        const stored = localStorage.getItem(CONFIG_KEY);
        return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
    },

    saveConfig(config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    },

    getAdapter() {
        const config = this.getConfig();
        return ADAPTERS[config.type] || LocalStorageAdapter;
    },

    async loadRequests() {
        const adapter = this.getAdapter();
        const config = this.getConfig();
        console.log(`[StorageService] Loading using ${adapter.name}`);
        return await adapter.load(config);
    },

    async saveRequests(data) {
        const adapter = this.getAdapter();
        const config = this.getConfig();
        console.log(`[StorageService] Saving all using ${adapter.name}`);
        return await adapter.save(data, config);
    },

    async upsertRequest(request) {
        const adapter = this.getAdapter();
        const config = this.getConfig();
        console.log(`[StorageService] Upserting request ${request.id} using ${adapter.name}`);
        // If adapter supports upsert, use it. Otherwise fall back to load -> modify -> save
        if (adapter.upsertRequest) {
            return await adapter.upsertRequest(request, config);
        } else {
            // Fallback for adapters that don't implement granular updates
            const all = await adapter.load(config);
            const index = all.findIndex(r => r.id === request.id);
            if (index !== -1) all[index] = request;
            else all.push(request);
            return await adapter.save(all, config);
        }
    }
};
