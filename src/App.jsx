import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, User as UserIcon } from 'lucide-react'; // Renamed User to UserIcon for clarity
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventBus } from './services/EventBus'; // Import EventBus
import Sidebar from './components/Sidebar';
import AccessForm from './components/AccessForm';
import ApproverDashboard from './components/ApproverDashboard';
import ReviewerTab from './components/ReviewerTab';
import AuditLog from './components/AuditLog';
import AdminSettings from './components/AdminSettings';
import Login from './components/Login';
import { StorageService } from './services/storage/StorageService';
import { CatalogService } from './services/catalog/CatalogService';
import { getRequests } from './services/mockData';
import './index.css';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [catalogs, setCatalogs] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [viewMode, setViewMode] = useState('REQUESTER');
  const [pendingCount, setPendingCount] = useState(0);

  // Helper to load catalogs based on current config/state
  const loadCatalogs = async (currentConfig, currentWorkspaceId) => {
    if (currentConfig.ucAuthType === 'ACCOUNT') {
      if (currentWorkspaceId) {
        const ws = workspaces.find(w => w.id === currentWorkspaceId);
        if (ws) {
          const fetched = await CatalogService.fetchCatalogs(ws.url);
          if (fetched) {
            setCatalogs(fetched);
            return;
          }
        }
      }
      // Fallback if no workspace selected or fetch failed
      setCatalogs([]);
    } else if (currentConfig.ucAuthType === 'WORKSPACE') {
      // Single Workspace Mode
      const fetched = await CatalogService.fetchCatalogs(currentConfig.ucHost);
      if (fetched) {
        setCatalogs(fetched);
      } else {
        // Fallback to mock if fetch fails
        CatalogService.fetchCatalogs(null).then(data => setCatalogs(data || []));
      }
    } else {
      // MOCK Mode
      CatalogService.fetchCatalogs(null).then(data => setCatalogs(data || []));
    }
  };

  useEffect(() => {
    const initData = async () => {
      const config = StorageService.getConfig();

      // 1. Fetch Workspaces if Account Mode
      if (config.ucAuthType === 'ACCOUNT') {
        setLoadingWorkspaces(true);
        setWorkspaceError(null);
        try {
          const wsList = await CatalogService.fetchWorkspaces();
          setWorkspaces(wsList);
          if (wsList.length > 0 && !selectedWorkspaceId) {
            setSelectedWorkspaceId(wsList[0].id);
          }
        } catch (err) {
          setWorkspaceError(err.message || 'Failed to fetch workspaces');
        } finally {
          setLoadingWorkspaces(false);
        }
      } else {
        setWorkspaces([]);
        setLoadingWorkspaces(false);
        setWorkspaceError(null);
      }

      // 2. Initial Catalog Load (will depend on workspace selection effect for Account mode)
      if (config.ucAuthType !== 'ACCOUNT') {
        loadCatalogs(config, null);
      }
    };

    initData();

    // Poll for pending requests count (simple implementation)
    const checkPending = async () => {
      const reqs = await getRequests();
      const pending = reqs.filter(r => r.status === 'PENDING').length;
      setPendingCount(pending);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000); // Poll every 5s

    // Subscribe to Settings Updates
    const handleSettingsUpdate = () => {
      console.log("Settings Updated - Refreshing App State");
      initData();
    };

    EventBus.on('SETTINGS_UPDATED', handleSettingsUpdate);

    return () => {
      clearInterval(interval);
      EventBus.remove('SETTINGS_UPDATED', handleSettingsUpdate);
    };
  }, [user]); // Re-run on user change (re-auth)

  // Effect to load catalogs when workspace selection changes
  useEffect(() => {
    if (selectedWorkspaceId) {
      const config = StorageService.getConfig();
      if (config.ucAuthType === 'ACCOUNT') {
        loadCatalogs(config, selectedWorkspaceId);
      }
    }
  }, [selectedWorkspaceId, workspaces]); // Depend on workspaces too so we can find the URL

  const handleToggleSelection = (id, node) => {
    const newSelectedIds = new Set(selectedIds);
    let newSelectedObjects = [...selectedObjects];

    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
      newSelectedObjects = newSelectedObjects.filter(obj => obj.id !== id);
    } else {
      newSelectedIds.add(id);
      newSelectedObjects.push(node);
    }

    setSelectedIds(newSelectedIds);
    setSelectedObjects(newSelectedObjects);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedObjects([]);
  };

  return (
    <div id="app-root">
      <header className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        marginBottom: '1rem',
        borderRadius: 0,
        borderLeft: 0, borderRight: 0, borderTop: 0
      }}>
        <div className="flex-center" style={{ gap: '12px' }}>
          <ShieldCheck size={24} color="var(--accent-color)" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Access Control Service</h1>
        </div>

        <div className="flex-center" style={{ gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
            <button
              className={`btn ${viewMode === 'REQUESTER' ? 'btn-primary' : 'btn-ghost'}`}
              style={viewMode !== 'REQUESTER' ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}}
              onClick={() => setViewMode('REQUESTER')}
            >
              Requester
            </button>
            <button
              className={`btn ${viewMode === 'APPROVER' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                ...(viewMode !== 'APPROVER' ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}),
                position: 'relative'
              }}
              onClick={() => setViewMode('APPROVER')}
            >
              Approver
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: 'var(--danger)',
                  color: 'white',
                  fontSize: '0.6rem',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  border: '2px solid var(--glass-bg)'
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              className={`btn ${viewMode === 'REVIEWER' ? 'btn-primary' : 'btn-ghost'}`}
              style={viewMode !== 'REVIEWER' ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}}
              onClick={() => setViewMode('REVIEWER')}
            >
              Reviewer
            </button>
            {user?.groups?.some(g => ['group_security', 'group_platform_admins'].includes(g)) && (
              <>
                <button
                  className={`btn ${viewMode === 'AUDIT' ? 'btn-primary' : 'btn-ghost'}`}
                  style={viewMode !== 'AUDIT' ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}}
                  onClick={() => setViewMode('AUDIT')}
                >
                  Audit Log
                </button>
                <button
                  className={`btn ${viewMode === 'SETTINGS' ? 'btn-primary' : 'btn-ghost'}`}
                  style={viewMode !== 'SETTINGS' ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}}
                  onClick={() => setViewMode('SETTINGS')}
                >
                  Settings
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '16px', borderLeft: '1px solid var(--glass-border)' }}>
            <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.provider}</div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid var(--glass-border)',
              background: 'var(--accent-color)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              {user?.initials || 'U'}
            </div>
            <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={logout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          catalogs={catalogs}
          selectedIds={selectedIds}
          onToggleSelection={handleToggleSelection}
          workspaces={workspaces}
          selectedWorkspaceId={selectedWorkspaceId}
          onWorkspaceChange={setSelectedWorkspaceId}
          loadingWorkspaces={loadingWorkspaces}
          workspaceError={workspaceError}
        />

        <section style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
          {viewMode === 'REQUESTER' && (
            <AccessForm
              selectedObjects={selectedObjects}
              onClearSelection={clearSelection}
            />
          )}
          {viewMode === 'APPROVER' && <ApproverDashboard />}
          {viewMode === 'REVIEWER' && (
            <ReviewerTab
              selectedObject={selectedObjects[selectedObjects.length - 1]}
            />
          )}
          {viewMode === 'AUDIT' && <AuditLog />}
          {viewMode === 'SETTINGS' && <AdminSettings />}
        </section>
      </main>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return null; // Or a global spinner
  return user ? <MainLayout /> : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
