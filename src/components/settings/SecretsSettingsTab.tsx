import React from 'react';
import { Lock } from 'lucide-react';

interface SecretsSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
    setIsMockVaultModalOpen: (isOpen: boolean) => void;
}

const SecretsSettingsTab: React.FC<SecretsSettingsTabProps> = ({ config, setConfig, setIsMockVaultModalOpen }) => {
    return (
        <div className="animate-fade-in">
            <h4><Lock size={18} style={{ display: 'inline', marginRight: 8 }} /> Secrets Management Configuration</h4>
            <p className="text-secondary text-sm mb-4">Choose how sensitive information (like Client Secrets) is retrieved.</p>

            <div className="form-group">
                <label>Secret Provider</label>
                <select
                    value={config.globalSecretProvider}
                    onChange={e => setConfig({ ...config, globalSecretProvider: e.target.value })}
                >
                    <option value="PLAIN">Plain Text (In-App Configuration)</option>
                    <option value="VAULT">HashiCorp Vault (Production)</option>
                    <option value="MOCK_VAULT">Mock Vault (Local Development)</option>
                </select>
            </div>

            {config.globalSecretProvider === 'VAULT' && (
                <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                    <h5>HashiCorp Vault Connection</h5>
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
                    <div className="form-group">
                        <label>Secret Store Path</label>
                        <input
                            type="text"
                            value={config.vaultSecretPath}
                            placeholder="secret/data/uc-access-app"
                            onChange={e => setConfig({ ...config, vaultSecretPath: e.target.value })}
                        />
                    </div>
                </div>
            )}

            {config.globalSecretProvider === 'MOCK_VAULT' && (
                <div className="config-section animate-fade-in" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                    <h5>Mock Vault Management</h5>
                    <div className="form-group">
                        <label>Secret Store Path (Mock)</label>
                        <input
                            type="text"
                            value={config.vaultSecretPath}
                            placeholder="secret/data/uc-access-app"
                            onChange={e => setConfig({ ...config, vaultSecretPath: e.target.value })}
                        />
                    </div>
                    <p className="text-secondary text-sm mb-4">Manage mock secrets stored in your browser session for testing.</p>
                    <button
                        className="btn btn-secondary btn-small"
                        onClick={() => setIsMockVaultModalOpen(true)}
                    >
                        Manage Mock Vault Secrets
                    </button>
                </div>
            )}

            {config.globalSecretProvider === 'PLAIN' && (
                <div className="p-4 rounded bg-white/5 border border-white/10 mt-4">
                    <p className="text-sm text-secondary">
                        Secrets are entered directly in the connection settings. This is the least secure method and should only be used for POCs.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SecretsSettingsTab;
