import React, { useState, useEffect } from 'react';
import { Save, Server, Database, GitBranch, HardDrive, CheckCircle } from 'lucide-react';
import { StorageService } from '../services/storage/StorageService';
import './AdminSettings.css';

const AdminSettings = () => {
    const [config, setConfig] = useState(StorageService.getConfig());
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        StorageService.saveConfig(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="admin-settings animate-fade-in">
            <h2>System Configuration</h2>
            <p className="text-secondary mb-4">Configure backend storage for Audit Logs and Request State.</p>

            <div className="glass-panel settings-card">
                <div className="form-group">
                    <label>Storage Backend</label>
                    <div className="backend-selector">
                        <button
                            className={`backend-option ${config.type === 'LOCAL' ? 'active' : ''}`}
                            onClick={() => setConfig({ ...config, type: 'LOCAL' })}
                        >
                            <HardDrive size={20} />
                            <span>Local Storage</span>
                        </button>
                        <button
                            className={`backend-option ${config.type === 'UNITY_CATALOG' ? 'active' : ''}`}
                            onClick={() => setConfig({ ...config, type: 'UNITY_CATALOG' })}
                        >
                            <Server size={20} />
                            <span>Unity Catalog</span>
                        </button>
                        <button
                            className={`backend-option ${config.type === 'RDBMS' ? 'active' : ''}`}
                            onClick={() => setConfig({ ...config, type: 'RDBMS' })}
                        >
                            <Database size={20} />
                            <span>External RDBMS</span>
                        </button>
                        <button
                            className={`backend-option ${config.type === 'GIT' ? 'active' : ''}`}
                            onClick={() => setConfig({ ...config, type: 'GIT' })}
                        >
                            <GitBranch size={20} />
                            <span>Git Repository</span>
                        </button>
                    </div>
                </div>

                {config.type === 'UNITY_CATALOG' && (
                    <div className="config-section animate-fade-in">
                        <h4>Unity Catalog Settings</h4>
                        <div className="form-group">
                            <label>Catalog</label>
                            <input
                                type="text"
                                value={config.ucCatalog}
                                onChange={e => setConfig({ ...config, ucCatalog: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Schema</label>
                            <input
                                type="text"
                                value={config.ucSchema}
                                onChange={e => setConfig({ ...config, ucSchema: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Table Name</label>
                            <input
                                type="text"
                                value={config.ucTable}
                                onChange={e => setConfig({ ...config, ucTable: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {config.type === 'RDBMS' && (
                    <div className="config-section animate-fade-in">
                        <h4>Database Connection</h4>
                        <div className="form-group">
                            <label>Connection String (JDBC/ODBC)</label>
                            <input
                                type="text"
                                className="code-input"
                                value={config.rdbmsConn}
                                onChange={e => setConfig({ ...config, rdbmsConn: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={config.rdbmsUser}
                                onChange={e => setConfig({ ...config, rdbmsUser: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                )}

                {config.type === 'GIT' && (
                    <div className="config-section animate-fade-in">
                        <h4>Git Repository</h4>
                        <div className="form-group">
                            <label>Repository URL</label>
                            <input
                                type="text"
                                value={config.gitRepo}
                                onChange={e => setConfig({ ...config, gitRepo: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Branch</label>
                            <input
                                type="text"
                                value={config.gitBranch}
                                onChange={e => setConfig({ ...config, gitBranch: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Personal Access Token</label>
                            <input
                                type="password"
                                placeholder="ghp_..."
                            />
                        </div>
                    </div>
                )}

                <div className="form-actions mt-6">
                    <button className="btn btn-primary btn-large" onClick={handleSave}>
                        {saved ? <><CheckCircle size={20} /> Settings Saved</> : <><Save size={20} /> Save Configuration</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
