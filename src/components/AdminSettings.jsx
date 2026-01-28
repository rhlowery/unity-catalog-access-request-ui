import React, { useState } from 'react';
import { Save, Server, Database, GitBranch, HardDrive, CheckCircle, Shield, Globe, Lock } from 'lucide-react';
import { StorageService } from '../services/storage/StorageService';
import { EventBus } from '../services/EventBus';
import './AdminSettings.css';

const AdminSettings = () => {
    const [config, setConfig] = useState(StorageService.getConfig());
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('STORAGE'); // STORAGE, IDENTITY, UNITY_CATALOG

    const handleSave = () => {
        StorageService.saveConfig(config);
        setSaved(true);
        EventBus.dispatch('SETTINGS_UPDATED', { config });
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="admin-settings animate-fade-in">
            <h2>System Configuration</h2>
            <p className="text-secondary mb-4">Manage storage backends, identity providers, and platform connections.</p>

            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'STORAGE' ? 'active' : ''}`}
                    onClick={() => setActiveTab('STORAGE')}
                >
                    Storage Backend
                </button>
                <button
                    className={`tab-btn ${activeTab === 'IDENTITY' ? 'active' : ''}`}
                    onClick={() => setActiveTab('IDENTITY')}
                >
                    Identity Provider
                </button>
                <button
                    className={`tab-btn ${activeTab === 'SECRETS' ? 'active' : ''}`}
                    onClick={() => setActiveTab('SECRETS')}
                >
                    Secrets Management
                </button>
                <button
                    className={`tab-btn ${activeTab === 'UNITY_CATALOG' ? 'active' : ''}`}
                    onClick={() => setActiveTab('UNITY_CATALOG')}
                >
                    Unity Catalog
                </button>
            </div>

            <div className="glass-panel settings-card">

                {/* SECRETS TAB */}
                {activeTab === 'SECRETS' && (
                    <div className="animate-fade-in">
                        <h4><Lock size={18} style={{ display: 'inline', marginRight: 8 }} /> HashiCorp Vault Configuration</h4>
                        <p className="text-secondary text-sm mb-4">Configure connection to HashiCorp Vault for secret retrieval.</p>

                        <div className="form-group">
                            <label>Vault Address</label>
                            <input
                                type="text"
                                value={config.vaultUrl}
                                placeholder="https://vault.mycompany.com:8200"
                                onChange={e => setConfig({ ...config, vaultUrl: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Vault Token</label>
                            <input
                                type="password"
                                value={config.vaultToken}
                                placeholder="hvs.xxxxxxxx..."
                                onChange={e => setConfig({ ...config, vaultToken: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Namespace (Optional)</label>
                            <input
                                type="text"
                                value={config.vaultNamespace}
                                placeholder="admin/my-namespace"
                                onChange={e => setConfig({ ...config, vaultNamespace: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* STORAGE TAB (Existing) */}
                {activeTab === 'STORAGE' && (
                    <div className="animate-fade-in">
                        <div className="form-group">
                            <label>Active Storage Backend</label>
                            <div className="backend-selector">
                                <button
                                    className={`backend-option ${config.type === 'LOCAL' ? 'active' : ''}`}
                                    onClick={() => setConfig({ ...config, type: 'LOCAL' })}
                                >
                                    <HardDrive size={24} />
                                    <span>Local Storage</span>
                                </button>
                                <button
                                    className={`backend-option ${config.type === 'UNITY_CATALOG' ? 'active' : ''}`}
                                    onClick={() => setConfig({ ...config, type: 'UNITY_CATALOG' })}
                                >
                                    <Server size={24} />
                                    <span>Unity Catalog</span>
                                </button>
                                <button
                                    className={`backend-option ${config.type === 'RDBMS' ? 'active' : ''}`}
                                    onClick={() => setConfig({ ...config, type: 'RDBMS' })}
                                >
                                    <Database size={24} />
                                    <span>RDBMS</span>
                                </button>
                                <button
                                    className={`backend-option ${config.type === 'GIT' ? 'active' : ''}`}
                                    onClick={() => setConfig({ ...config, type: 'GIT' })}
                                >
                                    <GitBranch size={24} />
                                    <span>Git Repository</span>
                                </button>
                            </div>
                        </div>

                        {/* UC Storage Config */}
                        {config.type === 'UNITY_CATALOG' && (
                            <div className="config-section animate-fade-in">
                                <h4>Unity Catalog Table Config</h4>
                                <div className="form-group"><label>Catalog</label><input type="text" value={config.ucCatalog} onChange={e => setConfig({ ...config, ucCatalog: e.target.value })} /></div>
                                <div className="form-group"><label>Schema</label><input type="text" value={config.ucSchema} onChange={e => setConfig({ ...config, ucSchema: e.target.value })} /></div>
                                <div className="form-group"><label>Table Name</label><input type="text" value={config.ucTable} onChange={e => setConfig({ ...config, ucTable: e.target.value })} /></div>
                            </div>
                        )}

                        {/* RDBMS Config */}
                        {config.type === 'RDBMS' && (
                            <div className="config-section animate-fade-in">
                                <h4>Database Connection</h4>
                                <div className="form-group"><label>Connection String</label><input type="text" className="code-input" value={config.rdbmsConn} onChange={e => setConfig({ ...config, rdbmsConn: e.target.value })} /></div>
                                <div className="form-group"><label>Username</label><input type="text" value={config.rdbmsUser} onChange={e => setConfig({ ...config, rdbmsUser: e.target.value })} /></div>
                                <div className="form-group"><label>Password</label><input type="password" placeholder="••••••••" /></div>
                            </div>
                        )}

                        {/* Git Config */}
                        {config.type === 'GIT' && (
                            <div className="config-section animate-fade-in">
                                <h4>Git Repository Options</h4>
                                <div className="form-group">
                                    <label>Git Provider</label>
                                    <select value={config.gitProvider} onChange={e => {
                                        const p = e.target.value;
                                        setConfig({ ...config, gitProvider: p, gitHost: p === 'GITHUB' ? 'github.com' : (p === 'GITLAB' ? 'gitlab.com' : '') });
                                    }}>
                                        <option value="GITHUB">GitHub</option>
                                        <option value="GITLAB">GitLab Cloud</option>
                                        <option value="GITLAB_SELF_HOSTED">GitLab Self-Hosted</option>
                                    </select>
                                </div>
                                {config.gitProvider === 'GITLAB_SELF_HOSTED' && (
                                    <div className="form-group"><label>Instance URL</label><input type="text" value={config.gitHost} onChange={e => setConfig({ ...config, gitHost: e.target.value })} /></div>
                                )}
                                <div className="form-group"><label>Project Path (owner/repo)</label><input type="text" value={config.gitRepo} onChange={e => setConfig({ ...config, gitRepo: e.target.value })} /></div>
                                <div className="form-group"><label>Branch</label><input type="text" value={config.gitBranch} onChange={e => setConfig({ ...config, gitBranch: e.target.value })} /></div>
                                <div className="form-group"><label>Access Token</label><input type="password" placeholder="ghp_... / glpat_..." /></div>
                            </div>
                        )}
                    </div>
                )}

                {/* IDENTITY TAB */}
                {/* IDENTITY TAB */}
                {activeTab === 'IDENTITY' && (
                    <div className="animate-fade-in">
                        <div className="form-group">
                            <label>Integration Type</label>
                            <select
                                value={config.identityType}
                                onChange={e => setConfig({ ...config, identityType: e.target.value })}
                            >
                                <option value="SCIM">SCIM 2.0 (User Sync)</option>
                                <option value="OAUTH">Generic OAuth 2.0 (OIDC)</option>
                                <option value="AZURE">Microsoft Azure Enterprise AD</option>
                                <option value="SAML">SAML 2.0 (SSO)</option>
                                <option value="DATABRICKS">Databricks / Unity Catalog</option>
                            </select>
                        </div>

                        {config.identityType === 'DATABRICKS' && (
                            <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                                <h4><Globe size={18} style={{ display: 'inline', marginRight: 8 }} /> Databricks Identity</h4>
                                <p className="text-secondary text-sm mb-4">
                                    Use the Users and Groups defined in the connected Unity Catalog workspace/account.
                                    <br />
                                    <span className="text-muted">Requires "Unity Catalog Connection" to be configured.</span>
                                </p>
                            </div>
                        )}

                        {config.identityType === 'SCIM' && (
                            <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                                <h4><Shield size={18} style={{ display: 'inline', marginRight: 8 }} /> SCIM Configuration</h4>
                                <p className="text-secondary text-sm mb-4">Configure SCIM 2.0 endpoint to sync Users and Groups.</p>

                                <div className="form-group">
                                    <label>SCIM Endpoint URL</label>
                                    <input type="text" value={config.scimUrl} placeholder="https://api.my-idp.com/scim/v2" onChange={e => setConfig({ ...config, scimUrl: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>SCIM API Token</label>
                                    <input type="password" value={config.scimToken} placeholder="Bearer Token..." onChange={e => setConfig({ ...config, scimToken: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {config.identityType === 'OAUTH' && (
                            <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                                <h4><Lock size={18} style={{ display: 'inline', marginRight: 8 }} /> OAuth 2.0 (OIDC)</h4>
                                <p className="text-secondary text-sm mb-4">Configure authentication provider metadata.</p>

                                <div className="form-group"><label>Client ID</label><input type="text" value={config.oauthClientId} onChange={e => setConfig({ ...config, oauthClientId: e.target.value })} /></div>
                                <div className="form-group"><label>Client Secret</label><input type="password" value={config.oauthClientSecret} onChange={e => setConfig({ ...config, oauthClientSecret: e.target.value })} /></div>
                                <div className="form-group"><label>Authorization URL</label><input type="text" value={config.oauthAuthUrl} onChange={e => setConfig({ ...config, oauthAuthUrl: e.target.value })} /></div>
                                <div className="form-group"><label>Token URL</label><input type="text" value={config.oauthTokenUrl} onChange={e => setConfig({ ...config, oauthTokenUrl: e.target.value })} /></div>
                            </div>
                        )}

                        {config.identityType === 'AZURE' && (
                            <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                                <h4><Lock size={18} style={{ display: 'inline', marginRight: 8 }} /> Azure Enterprise AD</h4>
                                <p className="text-secondary text-sm mb-4">Configure Azure AD for Enterprise SSO.</p>

                                <div className="form-group">
                                    <label>Directory (Tenant) ID</label>
                                    <input
                                        type="text"
                                        value={config.azureTenantId}
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                        onChange={e => setConfig({ ...config, azureTenantId: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Application (Client) ID</label>
                                    <input
                                        type="text"
                                        value={config.oauthClientId}
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                        onChange={e => setConfig({ ...config, oauthClientId: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Client Secret</label>
                                    <input
                                        type="password"
                                        value={config.oauthClientSecret}
                                        placeholder="Client Secret Value..."
                                        onChange={e => setConfig({ ...config, oauthClientSecret: e.target.value })}
                                    />
                                </div>

                                <div className="p-4 rounded bg-white/5 border border-white/10 mt-4">
                                    <label className="text-xs text-secondary uppercase tracking-wider mb-2 block">Computed Endpoints</label>
                                    <div className="text-xs font-mono text-muted mb-1">
                                        AUTH: https://login.microsoftonline.com/{config.azureTenantId || '{tenant}'}/oauth2/v2.0/authorize
                                    </div>
                                    <div className="text-xs font-mono text-muted">
                                        TOKEN: https://login.microsoftonline.com/{config.azureTenantId || '{tenant}'}/oauth2/v2.0/token
                                    </div>
                                </div>
                            </div>
                        )}

                        {config.identityType === 'SAML' && (
                            <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                                <h4><Shield size={18} style={{ display: 'inline', marginRight: 8 }} /> SAML 2.0 Configuration</h4>
                                <p className="text-secondary text-sm mb-4">Configure SAML SSO with x.509 Certificate.</p>

                                <div className="form-group">
                                    <label>Identity Provider SSO URL</label>
                                    <input
                                        type="text"
                                        value={config.samlSsoUrl}
                                        placeholder="https://idp.example.com/saml/sso"
                                        onChange={e => setConfig({ ...config, samlSsoUrl: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>x.509 Certificate (PEM)</label>
                                    <textarea
                                        value={config.samlCert}
                                        placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                                        onChange={e => setConfig({ ...config, samlCert: e.target.value })}
                                        style={{ fontFamily: 'monospace', height: '120px' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* SCIM Configuration (Decoupled) */}
                        <div className="config-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2rem', paddingTop: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <h4 style={{ marginBottom: '4px' }}><Shield size={18} style={{ display: 'inline', marginRight: 8 }} /> User Synchronization (SCIM)</h4>
                                    <p className="text-secondary text-sm" style={{ margin: 0 }}>Automatically sync users and groups from your IDP.</p>
                                </div>
                                <div className="checkbox-wrapper">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={config.scimEnabled}
                                            onChange={e => setConfig({ ...config, scimEnabled: e.target.checked })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </div>

                            {config.scimEnabled && (
                                <div className="animate-fade-in">
                                    <div className="form-group">
                                        <label>SCIM Endpoint URL</label>
                                        <input type="text" value={config.scimUrl} placeholder="https://api.my-idp.com/scim/v2" onChange={e => setConfig({ ...config, scimUrl: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>SCIM API Token</label>
                                        <input type="password" value={config.scimToken} placeholder="Bearer Token..." onChange={e => setConfig({ ...config, scimToken: e.target.value })} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* UNITY CATALOG TAB */}
                {activeTab === 'UNITY_CATALOG' && (
                    <div className="animate-fade-in">
                        <h4><Globe size={18} style={{ display: 'inline', marginRight: 8 }} /> Unity Catalog Connection</h4>
                        <p className="text-secondary text-sm mb-4">Global settings for connecting to the Databricks Workspace.</p>

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
                                <option value="WORKSPACE">Single Workspace</option>
                                <option value="ACCOUNT">Databricks Account (Unified Login)</option>
                            </select>
                        </div>

                        {config.ucAuthType === 'ACCOUNT' && (
                            <div className="form-group animate-fade-in">
                                <label>Databricks Account ID</label>
                                <input
                                    type="text"
                                    value={config.ucAccountId}
                                    placeholder="00000000-0000-0000-0000-000000000000"
                                    onChange={e => setConfig({ ...config, ucAccountId: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Host URL {config.ucAuthType === 'ACCOUNT' ? '(Account Console)' : '(Workspace)'}</label>
                            <input
                                type="text"
                                value={config.ucHost}
                                disabled={config.ucAuthType === 'ACCOUNT'}
                                placeholder={config.ucAuthType === 'ACCOUNT' ? "accounts.cloud.databricks.com" : "https://<workspace-id>.cloud.databricks.com"}
                                onChange={e => setConfig({ ...config, ucHost: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Service Principal Client ID</label>
                            <input
                                type="text"
                                value={config.ucClientId}
                                placeholder="UUID..."
                                onChange={e => setConfig({ ...config, ucClientId: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Service Principal Client Secret</label>
                            <div style={{ marginBottom: '12px' }}>
                                <select
                                    value={config.ucClientSecretSource}
                                    onChange={e => setConfig({ ...config, ucClientSecretSource: e.target.value })}
                                >
                                    <option value="PLAIN">Plain Text</option>
                                    <option value="VAULT">Fetch from Vault</option>
                                </select>
                            </div>

                            {config.ucClientSecretSource === 'VAULT' ? (
                                <div className="pl-4 border-l-2 border-accent" style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--accent-color)' }}>
                                    <div className="form-group">
                                        <label className="text-sm">Secret Path</label>
                                        <input
                                            type="text"
                                            value={config.ucClientSecretVaultPath}
                                            placeholder="secret/data/my-app/prod"
                                            onChange={e => setConfig({ ...config, ucClientSecretVaultPath: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-sm">JSON Key</label>
                                        <input
                                            type="text"
                                            value={config.ucClientSecretVaultKey}
                                            placeholder="client_secret"
                                            onChange={e => setConfig({ ...config, ucClientSecretVaultKey: e.target.value })}
                                        />
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
                                * <strong className="text-danger">WARNING:</strong> Client Secret is stored locally in this demo. Ensure this is secure in production.
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-actions mt-6">
                    <button className="btn btn-primary btn-large" onClick={handleSave}>
                        {saved ? <><CheckCircle size={20} /> Configuration Saved</> : <><Save size={20} /> Save Configuration</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
