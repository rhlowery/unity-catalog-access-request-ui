import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, LogOut, X, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './Sidebar';
import AccessForm from './AccessForm';
import ApproverDashboard from './ApproverDashboard';
import ReviewerTab from './ReviewerTab';
import AuditLog from './AuditLog';
import AdminSettings from './AdminSettings';
import { CatalogService } from '../services/catalog/CatalogService';
import { StorageService } from '../services/storage/StorageService';
import { getRequests } from '../services/mockData';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [catalogs, setCatalogs] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [viewMode, setViewMode] = useState('REVIEWER');
  const [pendingCount, setPendingCount] = useState(0);

  const loadCatalogs = useCallback(async (currentConfig, currentWorkspaceId) => {
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
      setCatalogs([]);
    } else if (currentConfig.ucAuthType === 'WORKSPACE') {
      const fetched = await CatalogService.fetchCatalogs(currentConfig.ucHost);
      if (fetched) {
        setCatalogs(fetched);
      } else {
        CatalogService.fetchCatalogs(null).then(data => setCatalogs(data || []));
      }
    } else {
      CatalogService.fetchCatalogs(null).then(data => setCatalogs(data || []));
    }
  }, [workspaces]);

  useEffect(() => {
    const initData = async () => {
      const config = StorageService.getConfig();

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

      if (config.ucAuthType !== 'ACCOUNT') {
        loadCatalogs(config, null);
      }
    };

    initData();

    const checkPending = async () => {
      const reqs = await getRequests();
      const pending = reqs.filter(r => r.status === 'PENDING').length;
      setPendingCount(pending);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => clearInterval(interval);
  }, [user, loadCatalogs]);

  useEffect(() => {
    if (selectedWorkspaceId) {
      const config = StorageService.getConfig();
      if (config.ucAuthType === 'ACCOUNT') {
        loadCatalogs(config, selectedWorkspaceId);
      }
    }
  }, [selectedWorkspaceId, workspaces]);

  const handleToggleSelection = useCallback((id, node) => {
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
  }, [selectedIds, selectedObjects]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedObjects([]);
  }, []);

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
          <ViewModeTabs viewMode={viewMode} setViewMode={setViewMode} pendingCount={pendingCount} user={user} />
          <UserControls user={user} logout={logout} />
        </div>
      </header>

      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ErrorBoundary>
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
        </ErrorBoundary>

        <section style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
          <ErrorBoundary>
            <ContentView 
              viewMode={viewMode}
              selectedObjects={selectedObjects}
              onClearSelection={clearSelection}
            />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );
};

const ViewModeTabs = ({ viewMode, setViewMode, pendingCount, user }: any) => {
  return (
    <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
      <TabButton
        viewMode={viewMode}
        mode="REVIEWER"
        setViewMode={setViewMode}
        label="Current Access"
      />
      <TabButton
        viewMode={viewMode}
        mode="CHANGE_REQUEST"
        setViewMode={setViewMode}
        label="Access Request"
      />
      <TabButton
        viewMode={viewMode}
        mode="APPROVER"
        setViewMode={setViewMode}
        label="Approver"
        badge={pendingCount > 0 ? pendingCount : null}
      />
      {(user?.groups?.some((g: any) => ['group_security', 'group_platform_admins'].includes(g))) && (
        <>
          <TabButton
            viewMode={viewMode}
            mode="AUDIT"
            setViewMode={setViewMode}
            label="Audit Log"
          />
          <TabButton
            viewMode={viewMode}
            mode="SETTINGS"
            setViewMode={setViewMode}
            label="Settings"
          />
        </>
      )}
    </div>
  );
};

const TabButton = ({ viewMode, mode, setViewMode, label, badge }: any) => {
  const isActive = viewMode === mode;
  return (
    <button
      className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
      style={!isActive ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}}
      onClick={() => setViewMode(mode)}
    >
      {label}
      {badge !== null && (
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
          {badge}
        </span>
      )}
    </button>
  );
};

const UserControls = ({ user, logout }) => (
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
);

const ContentView = ({ viewMode, selectedObjects, onClearSelection }: any) => {
  switch (viewMode) {
    case 'CHANGE_REQUEST':
      return <AccessForm selectedObjects={selectedObjects} onClearSelection={onClearSelection} />;
    case 'REVIEWER':
      return <ReviewerTab selectedObject={selectedObjects.length > 0 ? selectedObjects[selectedObjects.length - 1] : null} />;
    case 'APPROVER':
      return <ApproverDashboard />;
    case 'AUDIT':
      return <AuditLog />;
    case 'SETTINGS':
      return <AdminSettings />;
    default:
      return null;
  }
};

export default MainLayout;