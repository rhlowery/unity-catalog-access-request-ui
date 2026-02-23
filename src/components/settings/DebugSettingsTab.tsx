import React from 'react';
import { Bug } from 'lucide-react';
import { ObservabilityService } from '../../services/ObservabilityService';
import ErrorTestPanel from '../ErrorTestPanel';

interface DebugSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}

const DebugSettingsTab: React.FC<DebugSettingsTabProps> = ({ config, setConfig }) => {
    return (
        <div className="animate-fade-in">
            <h4><Bug size={18} style={{ display: 'inline', marginRight: 8 }} /> Debug Tools</h4>
            <p className="text-secondary text-sm mb-4">Development tools for testing and debugging.</p>

            <ErrorTestPanel />

            <div className="glass-panel" style={{ padding: '1.5rem', margin: '1rem 0' }}>
                <h5>Error Log Viewer</h5>
                <p className="text-secondary text-sm mb-3">
                    Recent errors caught by ErrorBoundaries (stored in localStorage)
                </p>

                <div style={{ marginBottom: '1rem' }}>
                    <h5>Governance Settings</h5>
                    <div className="form-group mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="mb-0">Enable Persona Simulation</label>
                                <p className="text-secondary text-xs">Allow users to switch personas in the Approver Dashboard for testing/demos.</p>
                            </div>
                            <button
                                className={`btn ${config.enableSimulationMode ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setConfig({ ...config, enableSimulationMode: !config.enableSimulationMode })}
                                style={{ padding: '4px 12px', fontSize: '12px' }}
                            >
                                {config.enableSimulationMode ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            const errors = ObservabilityService.getRecentErrors();
                            console.log('Recent errors:', errors);
                        }}
                    >
                        Log Errors to Console
                    </button>

                    <button
                        className="btn btn-secondary"
                        style={{ marginLeft: '0.5rem' }}
                        onClick={() => {
                            ObservabilityService.clearErrorLog();
                            alert('Error log cleared');
                        }}
                    >
                        Clear Error Log
                    </button>
                </div>

                <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '1rem',
                    borderRadius: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                }}>
                    {ObservabilityService.getRecentErrors().length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)' }}>No recent errors</div>
                    ) : (
                        ObservabilityService.getRecentErrors().map((error: any) => (
                            <div key={error.id} style={{
                                marginBottom: '1rem',
                                padding: '0.5rem',
                                background: 'rgba(255,0,0,0.1)',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,0,0,0.3)'
                            }}>
                                <div><strong>ID:</strong> {error.id}</div>
                                <div><strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}</div>
                                <div><strong>Error:</strong> {error.error?.message || 'Unknown error'}</div>
                                <div><strong>URL:</strong> {error.url}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DebugSettingsTab;
