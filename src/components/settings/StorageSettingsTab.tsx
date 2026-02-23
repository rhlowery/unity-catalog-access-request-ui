import React from 'react';

interface StorageSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}

const StorageSettingsTab: React.FC<StorageSettingsTabProps> = ({ config, setConfig }) => {
    return (
        <div className="animate-fade-in">
            <div className="form-group">
                <label>Active Storage Backend</label>
                <select
                    value={config.type}
                    onChange={e => setConfig({ ...config, type: e.target.value })}
                >
                    <option value="MOCK">Mock (Volatile)</option>
                    <option value="LOCAL">Local Browser Storage</option>
                    <option value="UNITY_CATALOG">Unity Catalog Table</option>
                    <option value="RDBMS">Relational Database (SQL)</option>
                    <option value="GIT">Git Repository (GitOps)</option>
                </select>
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
                    <div className="form-group"><label>Connection String</label><input type="text" value={config.rdbmsConn} onChange={e => setConfig({ ...config, rdbmsConn: e.target.value })} /></div>
                    <div className="form-group"><label>Username</label><input type="text" value={config.rdbmsUser} onChange={e => setConfig({ ...config, rdbmsUser: e.target.value })} /></div>

                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={config.rdbmsPasswordSource}
                                onChange={e => setConfig({ ...config, rdbmsPasswordSource: e.target.value })}
                                style={{ width: 'auto' }}
                            >
                                <option value="PLAIN">Plain Text</option>
                                <option value="VAULTED">Vaulted (Configured Provider)</option>
                            </select>
                            <span className="text-xs text-secondary">Source Provider</span>
                        </div>

                        {config.rdbmsPasswordSource === 'VAULTED' ? (
                            <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                <div className="form-group">
                                    <label className="text-xs">Vault JSON Key</label>
                                    <input
                                        type="text"
                                        value={config.rdbmsPasswordVaultKey}
                                        placeholder="database_password"
                                        onChange={e => setConfig({ ...config, rdbmsPasswordVaultKey: e.target.value })}
                                    />
                                    <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                </div>
                            </div>
                        ) : (
                            <input
                                type="password"
                                value={config.rdbmsPassword}
                                placeholder="••••••••"
                                onChange={e => setConfig({ ...config, rdbmsPassword: e.target.value })}
                            />
                        )}
                    </div>
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

                    <div className="form-group">
                        <label>Access Token</label>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                value={config.gitTokenSource}
                                onChange={e => setConfig({ ...config, gitTokenSource: e.target.value })}
                                style={{ width: 'auto' }}
                            >
                                <option value="PLAIN">Plain Text</option>
                                <option value="VAULTED">Vaulted (Configured Provider)</option>
                            </select>
                            <span className="text-xs text-secondary">Source Provider</span>
                        </div>

                        {config.gitTokenSource === 'VAULTED' ? (
                            <div className="pl-4 border-l-2 border-accent" style={{ borderLeft: '2px solid var(--accent-color)', paddingLeft: '1rem' }}>
                                <div className="form-group">
                                    <label className="text-xs">Vault JSON Key</label>
                                    <input
                                        type="text"
                                        value={config.gitTokenVaultKey}
                                        placeholder="git_token"
                                        onChange={e => setConfig({ ...config, gitTokenVaultKey: e.target.value })}
                                    />
                                    <small className="text-secondary" style={{ fontSize: '10px' }}>Resolving from: {config.vaultSecretPath}</small>
                                </div>
                            </div>
                        ) : (
                            <input
                                type="password"
                                value={config.gitToken}
                                placeholder="ghp_... / glpat_..."
                                onChange={e => setConfig({ ...config, gitToken: e.target.value })}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StorageSettingsTab;
