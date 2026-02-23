import React from 'react';
import { Shield, Globe, Lock } from 'lucide-react';

interface IdentitySettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}

const IdentitySettingsTab: React.FC<IdentitySettingsTabProps> = ({ config, setConfig }) => {
    return (
        <div className="animate-fade-in">
            <div className="form-group">
                <label>Integration Type</label>
                <select
                    value={config.identityType}
                    onChange={e => setConfig({ ...config, identityType: e.target.value })}
                >
                    <option value="MOCK">Mock (Development)</option>
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
                    <div className="form-group"><label>SCIM Endpoint URL</label><input type="text" value={config.scimUrl} onChange={e => setConfig({ ...config, scimUrl: e.target.value })} placeholder="https://api.my-idp.com/scim/v2" /></div>

                    <div className="form-group">
                        <label>SCIM API Token</label>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={config.scimTokenSource}
                                onChange={e => setConfig({ ...config, scimTokenSource: e.target.value })}
                                style={{ width: 'auto' }}
                            >
                                <option value="PLAIN">Plain Text</option>
                                <option value="VAULTED">Vaulted (Configured Provider)</option>
                            </select>
                            <span className="text-xs text-secondary">Source Provider</span>
                        </div>

                        {config.scimTokenSource === 'VAULTED' ? (
                            <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                <div className="form-group">
                                    <label className="text-xs">Vault JSON Key</label>
                                    <input
                                        type="text"
                                        value={config.scimTokenVaultKey}
                                        placeholder="scim_token"
                                        onChange={e => setConfig({ ...config, scimTokenVaultKey: e.target.value })}
                                    />
                                    <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                </div>
                            </div>
                        ) : (
                            <input
                                type="password"
                                value={config.scimToken}
                                placeholder="Bearer Token..."
                                onChange={e => setConfig({ ...config, scimToken: e.target.value })}
                            />
                        )}
                    </div>
                </div>
            )}

            {config.identityType === 'OAUTH' && (
                <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                    <h4><Lock size={18} style={{ display: 'inline', marginRight: 8 }} /> OAuth 2.0 (OIDC)</h4>
                    <p className="text-secondary text-sm mb-4">Configure authentication provider metadata.</p>
                    <div className="form-group"><label>Client ID</label><input type="text" value={config.oauthClientId} onChange={e => setConfig({ ...config, oauthClientId: e.target.value })} /></div>
                    <div className="form-group">
                        <label>Client Secret</label>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={config.oauthClientSecretSource}
                                onChange={e => setConfig({ ...config, oauthClientSecretSource: e.target.value })}
                                style={{ width: 'auto' }}
                            >
                                <option value="PLAIN">Plain Text</option>
                                <option value="VAULTED">Vaulted (Configured Provider)</option>
                            </select>
                            <span className="text-xs text-secondary">Source Provider</span>
                        </div>

                        {config.oauthClientSecretSource === 'VAULTED' ? (
                            <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                <div className="form-group">
                                    <label className="text-xs">Vault JSON Key</label>
                                    <input
                                        type="text"
                                        value={config.oauthClientSecretVaultKey}
                                        placeholder="identity_client_secret"
                                        onChange={e => setConfig({ ...config, oauthClientSecretVaultKey: e.target.value })}
                                    />
                                    <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                </div>
                            </div>
                        ) : (
                            <input
                                type="password"
                                value={config.oauthClientSecret}
                                onChange={e => setConfig({ ...config, oauthClientSecret: e.target.value })}
                            />
                        )}
                    </div>
                    <div className="form-group"><label>Authorization URL</label><input type="text" value={config.oauthAuthUrl} onChange={e => setConfig({ ...config, oauthAuthUrl: e.target.value })} /></div>
                    <div className="form-group"><label>Token URL</label><input type="text" value={config.oauthTokenUrl} onChange={e => setConfig({ ...config, oauthTokenUrl: e.target.value })} /></div>
                </div>
            )}

            {config.identityType === 'AZURE' && (
                <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                    <h4><Lock size={18} style={{ display: 'inline', marginRight: 8 }} /> Azure Enterprise AD</h4>
                    <p className="text-secondary text-sm mb-4">Configure Azure AD for Enterprise SSO.</p>
                    <div className="form-group"><label>Directory (Tenant) ID</label><input type="text" value={config.azureTenantId} onChange={e => setConfig({ ...config, azureTenantId: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" /></div>
                    <div className="form-group"><label>Application (Client) ID</label><input type="text" value={config.oauthClientId} onChange={e => setConfig({ ...config, oauthClientId: e.target.value })} placeholder="00000000-0000-0000-0000-000000000000" /></div>
                    <div className="form-group">
                        <label>Client Secret</label>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={config.oauthClientSecretSource}
                                onChange={e => setConfig({ ...config, oauthClientSecretSource: e.target.value })}
                                style={{ width: 'auto' }}
                            >
                                <option value="PLAIN">Plain Text</option>
                                <option value="VAULTED">Vaulted (Configured Provider)</option>
                            </select>
                            <span className="text-xs text-secondary">Source Provider</span>
                        </div>

                        {config.oauthClientSecretSource === 'VAULTED' ? (
                            <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                <div className="form-group">
                                    <label className="text-xs">Vault JSON Key</label>
                                    <input
                                        type="text"
                                        value={config.oauthClientSecretVaultKey}
                                        placeholder="identity_client_secret"
                                        onChange={e => setConfig({ ...config, oauthClientSecretVaultKey: e.target.value })}
                                    />
                                    <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                </div>
                            </div>
                        ) : (
                            <input
                                type="password"
                                value={config.oauthClientSecret}
                                onChange={e => setConfig({ ...config, oauthClientSecret: e.target.value })}
                                placeholder="Client Secret Value..."
                            />
                        )}
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
                    <div className="form-group"><label>Identity Provider SSO URL</label><input type="text" value={config.samlSsoUrl} onChange={e => setConfig({ ...config, samlSsoUrl: e.target.value })} placeholder="https://idp.example.com/saml/sso" /></div>

                    <div className="form-group">
                        <label>x.509 Certificate (PEM)</label>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={config.samlCertSource}
                                onChange={e => setConfig({ ...config, samlCertSource: e.target.value })}
                                style={{ width: 'auto' }}
                            >
                                <option value="PLAIN">Plain Text</option>
                                <option value="VAULTED">Vaulted (Configured Provider)</option>
                            </select>
                            <span className="text-xs text-secondary">Source Provider</span>
                        </div>

                        {config.samlCertSource === 'VAULTED' ? (
                            <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                <div className="form-group">
                                    <label className="text-xs">Vault JSON Key</label>
                                    <input
                                        type="text"
                                        value={config.samlCertVaultKey}
                                        placeholder="saml_cert"
                                        onChange={e => setConfig({ ...config, samlCertVaultKey: e.target.value })}
                                    />
                                    <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                </div>
                            </div>
                        ) : (
                            <textarea
                                value={config.samlCert}
                                onChange={e => setConfig({ ...config, samlCert: e.target.value })}
                                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                                style={{ fontFamily: 'monospace', height: '120px' }}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* SCIM Configuration (Decoupled) - Hidden if using Databricks or Mock natively */}
            {!['DATABRICKS', 'MOCK'].includes(config.identityType) && (
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
                            <div className="form-group"><label>SCIM Endpoint URL</label><input type="text" value={config.scimUrl} onChange={e => setConfig({ ...config, scimUrl: e.target.value })} placeholder="https://api.my-idp.com/scim/v2" /></div>

                            <div className="form-group">
                                <label>SCIM API Token</label>
                                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                        value={config.scimTokenSource}
                                        onChange={e => setConfig({ ...config, scimTokenSource: e.target.value })}
                                        style={{ width: 'auto' }}
                                    >
                                        <option value="PLAIN">Plain Text</option>
                                        <option value="VAULTED">Vaulted (Configured Provider)</option>
                                    </select>
                                    <span className="text-xs text-secondary">Source Provider</span>
                                </div>

                                {config.scimTokenSource === 'VAULTED' ? (
                                    <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                        <div className="form-group">
                                            <label className="text-xs">Vault JSON Key</label>
                                            <input
                                                type="text"
                                                value={config.scimTokenVaultKey}
                                                placeholder="scim_token"
                                                onChange={e => setConfig({ ...config, scimTokenVaultKey: e.target.value })}
                                            />
                                            <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        type="password"
                                        value={config.scimToken}
                                        placeholder="Bearer Token..."
                                        onChange={e => setConfig({ ...config, scimToken: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IdentitySettingsTab;
