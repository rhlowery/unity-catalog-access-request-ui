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
    gitRepo: 'https://github.com/org/access-requests',
    gitBranch: 'main'
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
        console.log(`[StorageService] Saving using ${adapter.name}`);
        return await adapter.save(data, config);
    }
};
