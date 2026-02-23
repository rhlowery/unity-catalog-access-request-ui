import React from 'react';
import { Globe } from 'lucide-react';

interface UnityCatalogSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}

const UnityCatalogSettingsTab: React.FC<UnityCatalogSettingsTabProps> = ({ config, setConfig }) => {
    return (
        <div className="animate-fade-in">
            <h4><Globe size={18} style={{ display: 'inline', marginRight: 8 }} /> Unity Catalog Schema Connection</h4>
            <p className="text-secondary text-sm mb-4">Global settings for connecting to Databricks Workspace.</p>

            <div className="form-group">
                <label>Connection Type</label>
                <select
                    value={config.ucAuthType}
                    onChange={e => {
                        const val = e.target.value;
                        setConfig({
                            ...config,
                            ucAuthType: val,
                            ucHost: val === 'ACCOUNT' ? 'accounts.cloud.databricks.com' : ''
                        });
                    }}
                >
                    <option value="MOCK">Mock (Development)</option>
                    <option value="WORKSPACE">Databricks Single Workspace</option>
                    <option value="UC_OSS">Unity Catalog OSS</option>
                    <option value="ACCOUNT">Databricks Account (Unified Login)</option>
                </select>
            </div>

            {/* Hide real connection fields if MOCK */}
            {config.ucAuthType !== 'MOCK' && (
                <>
                    <div className="form-group"><label>Catalog Name</label><input type="text" value={config.ucCatalog} onChange={e => setConfig({ ...config, ucCatalog: e.target.value })} placeholder="default" /></div>
                    <div className="form-group"><label>Schema Name</label><input type="text" value={config.ucSchema} onChange={e => setConfig({ ...config, ucSchema: e.target.value })} placeholder="acs" /></div>
                    <div className="form-group mb-4">
                        <label>Additional Tables (comma-separated)</label>
                        <input
                            type="text"
                            value={config.ucTables || ''}
                            onChange={e => setConfig({ ...config, ucTables: e.target.value })}
                            placeholder="requests,approvals,audit_log"
                            style={{ fontFamily: 'monospace' }}
                        />
                        <p className="text-secondary text-xs">
                            Enter table names to be created in the schema. Multiple tables support different services.
                            <br />Example: <code>requests,approvals,audit_log</code>
                        </p>
                    </div>

                    {config.ucAuthType === 'ACCOUNT' && (
                        <div className="form-group"><label>Databricks Account ID</label><input type="text" value={config.ucAccountId} onChange={e => setConfig({ ...config, ucAccountId: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" /></div>
                    )}

                    <div className="form-group">
                        <label>Host URL {config.ucAuthType === 'ACCOUNT' ? '(Account Console)' : '(Workspace)'}</label>
                        <input
                            type="text"
                            value={config.ucHost}
                            placeholder={config.ucAuthType === 'ACCOUNT' ? "accounts.cloud.databricks.com" : "https://<workspace-id>.cloud.databricks.com"}
                            onChange={e => setConfig({ ...config, ucHost: e.target.value })}
                        />
                    </div>

                    <div className="form-group"><label>Service Principal Client ID</label><input type="text" value={config.ucClientId} onChange={e => setConfig({ ...config, ucClientId: e.target.value })} placeholder="UUID..." /></div>

                    <div className="form-group">
                        <label>Service Principal Client Secret</label>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={config.ucClientSecretSource}
                                onChange={e => setConfig({ ...config, ucClientSecretSource: e.target.value })}
                                style={{ width: 'auto' }}
                            >
                                <option value="PLAIN">Plain Text</option>
                                <option value="VAULTED">Vaulted (Configured Provider)</option>
                            </select>
                            <span className="text-xs text-secondary">Source Provider</span>
                        </div>

                        {config.ucClientSecretSource === 'VAULTED' ? (
                            <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                <div className="form-group">
                                    <label className="text-xs">Vault JSON Key</label>
                                    <input
                                        type="text"
                                        value={config.ucClientSecretVaultKey}
                                        placeholder="client_secret"
                                        onChange={e => setConfig({ ...config, ucClientSecretVaultKey: e.target.value })}
                                    />
                                    <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                </div>
                            </div>
                        ) : (
                            <input
                                type="password"
                                value={config.ucClientSecret}
                                placeholder="Secret..."
                                onChange={e => setConfig({ ...config, ucClientSecret: e.target.value })}
                            />
                        )}
                    </div>

                    <div className="mt-6">
                        <div className="text-xs text-secondary">
                            * Uses OAuth 2.0 Client Credentials flow (M2M) to fetch a short-lived access token.
                            <br />
                            * <strong className="text-danger">WARNING:</strong> Configuration stored locally in this demo. Use Vault for production secrets.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UnityCatalogSettingsTab;
