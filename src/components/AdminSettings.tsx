import React, { useState } from 'react';
import { X, Bug, Save, Lock, CheckCircle } from 'lucide-react';
import { StorageService } from '../services/storage/StorageService';
import { EventBus } from '../services/EventBus';
import { clearTokenCache } from '../services/UCIdentityService';

import StorageSettingsTab from './settings/StorageSettingsTab';
import IdentitySettingsTab from './settings/IdentitySettingsTab';
import SecretsSettingsTab from './settings/SecretsSettingsTab';
import UnityCatalogSettingsTab from './settings/UnityCatalogSettingsTab';
import DebugSettingsTab from './settings/DebugSettingsTab';

import './AdminSettings.css';

const AdminSettings = () => {
    const [config, setConfig] = useState(StorageService.getConfig());
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('STORAGE'); // STORAGE, IDENTITY, UNITY_CATALOG, SECRETS
    const [isMockVaultModalOpen, setIsMockVaultModalOpen] = useState(false);
    const [mockVaultJson, setMockVaultJson] = useState(() => {
        return localStorage.getItem('acs_mock_vault_secrets_v1') || '{}';
    });

    const handleSave = () => {
        StorageService.updateConfig(config);
        clearTokenCache();
        setSaved(true);
        EventBus.dispatch('SETTINGS_UPDATED', { config });
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="admin-settings animate-fade-in">
            <p className="text-secondary mb-4">Manage storage backends, identity providers, and catalog connections.</p>

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
                {import.meta.env.DEV && (
                    <button
                        className={`tab-btn ${activeTab === 'DEBUG' ? 'active' : ''}`}
                        onClick={() => setActiveTab('DEBUG')}
                    >
                        <Bug size={16} style={{ marginRight: '4px' }} />
                        Debug & Governance
                    </button>
                )}
            </div>

            <div className="glass-panel settings-card">

                {activeTab === 'STORAGE' && <StorageSettingsTab config={config} setConfig={setConfig} />}
                {activeTab === 'IDENTITY' && <IdentitySettingsTab config={config} setConfig={setConfig} />}
                {activeTab === 'SECRETS' && <SecretsSettingsTab config={config} setConfig={setConfig} setIsMockVaultModalOpen={setIsMockVaultModalOpen} />}
                {activeTab === 'UNITY_CATALOG' && <UnityCatalogSettingsTab config={config} setConfig={setConfig} />}
                {import.meta.env.DEV && activeTab === 'DEBUG' && <DebugSettingsTab config={config} setConfig={setConfig} />}

                <div className="form-actions mt-6">
                    <button className="btn btn-primary btn-large" onClick={handleSave}>
                        {saved ? <><CheckCircle size={20} /> Configuration Saved</> : <><Save size={20} /> Save Configuration</>}
                    </button>
                </div>
            </div>

            {/* MOCK VAULT SECRETS MODAL */}
            {isMockVaultModalOpen && (
                <div className="modal-overlay">
                    <div className="glass-panel modal-content animate-fade-in" style={{ maxWidth: '600px', width: '90%' }}>
                        <div className="modal-header">
                            <h3><Lock size={18} /> Manage Mock Vault Secrets</h3>
                            <button className="btn-icon" onClick={() => setIsMockVaultModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-secondary text-sm mb-3">
                                Edit the mock secrets in JSON format. The keys represent paths, and values are objects with key-value pairs.
                            </p>
                            <textarea
                                value={mockVaultJson}
                                onChange={e => setMockVaultJson(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '300px',
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    padding: '12px',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '4px'
                                }}
                                placeholder='{ "secret/path": { "key": "value" } }'
                            />
                        </div>
                        <div className="modal-footer mt-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => setIsMockVaultModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => {
                                try {
                                    JSON.parse(mockVaultJson); // Validate JSON
                                    localStorage.setItem('acs_mock_vault_secrets_v1', mockVaultJson);
                                    setIsMockVaultModalOpen(false);
                                } catch {
                                    alert("Invalid JSON format. Please correct it.");
                                }
                            }}>Save Mock Secrets</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
