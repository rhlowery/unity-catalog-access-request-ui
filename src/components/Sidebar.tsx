import { StorageService } from '../services/storage/StorageService';
import CatalogTree from './CatalogTree';

const Sidebar = ({
    catalogs,
    selectedIds,
    onToggleSelection,
    workspaces,
    selectedWorkspaceId,
    onWorkspaceChange,
    loadingWorkspaces,
    workspaceError,
    width = '300px'
}) => {
    return (
        <aside className="glass-panel" style={{
            width,
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
        }}>
            {(() => {
                const config = StorageService.getConfig();
                // Show only if in ACCOUNT mode
                if (config.ucAuthType === 'ACCOUNT') {
                    return (
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Active Workspace</label>
                            <select
                                value={selectedWorkspaceId}
                                onChange={e => onWorkspaceChange(e.target.value)}
                                disabled={loadingWorkspaces || !!workspaceError}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-color)' }}>
                                {loadingWorkspaces ? (
                                    <option>Loading...</option>
                                ) : workspaceError ? (
                                    <option>Error: {workspaceError}</option>
                                ) : workspaces.length > 0 ? (
                                    workspaces.map(ws => (
                                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                                    ))
                                ) : (
                                    <option>No workspaces found</option>
                                )}
                            </select>
                        </div>
                    );
                }
                return null;
             })()}

            <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Data Catalog
                </h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <CatalogTree
                    nodes={catalogs}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                />
            </div>
        </aside>
    );
};

export default Sidebar;
