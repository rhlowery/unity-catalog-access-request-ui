import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, LogOut, X, CheckCircle, AlertCircle, Shield, Settings, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
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
import { ObservabilityService } from '../services/ObservabilityService';
import { EventBus } from '../services/EventBus';
import { getRequests } from '../services/mockData';

const SIDEBAR_MIN_WIDTH = 150;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_DEFAULT_WIDTH = 300;

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
  const [errorCount, setErrorCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const savedWidth = localStorage.getItem('acs_sidebar_width');
    const savedCollapsed = localStorage.getItem('acs_sidebar_collapsed');
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth));
    }
    if (savedCollapsed === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

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

  useEffect(() => {
    const checkErrors = () => {
      const errors = ObservabilityService.getRecentErrors(50);
      const count = Array.isArray(errors) ? errors.filter(e => e && e.id).length : 0;
      setErrorCount(count);
    };

    checkErrors();
    const interval = setInterval(checkErrors, 5000);

    // Listen for error log clear event
    EventBus.on('ERROR_LOG_CLEARED', () => {
      setErrorCount(0);
    });

    return () => {
      clearInterval(interval);
      EventBus.remove('ERROR_LOG_CLEARED', () => {});
    };
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing]);

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

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResize = useCallback((e) => {
    if (isResizing) {
      const newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, e.clientX - 5));
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    localStorage.setItem('acs_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  const toggleSidebar = useCallback(() => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    localStorage.setItem('acs_sidebar_collapsed', newCollapsed ? 'true' : 'false');
  }, [isSidebarCollapsed]);

  return (
    <div id="app-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Access Control System</h1>
        </div>

        <div className="flex-center" style={{ gap: '16px' }}>
          <ViewModeTabs viewMode={viewMode} setViewMode={setViewMode} pendingCount={pendingCount} errorCount={errorCount} user={user} />
          <UserControls user={user} logout={logout} />
        </div>
      </header>

      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                width: isSidebarCollapsed ? 0 : sidebarWidth,
                minWidth: isSidebarCollapsed ? 0 : SIDEBAR_MIN_WIDTH,
                maxWidth: SIDEBAR_MAX_WIDTH,
                transition: isResizing ? 'none' : 'width 0.2s ease',
                flexShrink: 0,
                marginLeft: '5px'
              }}
          >
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
                 width={`${sidebarWidth}px`}
               />
             </ErrorBoundary>
           </div>

            <div
              style={{
                position: 'absolute',
                left: `${sidebarWidth + 5}px`,
                width: '4px',
                height: '100%',
                cursor: 'col-resize',
                background: 'transparent',
                zIndex: 10,
                flexShrink: 0
              }}
              onMouseDown={handleResizeStart}
            />

           <div
             onMouseMove={handleResize}
             onMouseUp={handleResizeEnd}
             onMouseLeave={handleResizeEnd}
             style={{ display: isResizing ? 'block' : 'none', position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, zIndex: 9999 }}
           />

            <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div className="glass-panel" style={{
            width: '100%',
            height: '100%',
            maxWidth: '1200px',
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'var(--border-radius)'
          }}>
            <ErrorBoundary>
              <ContentView
                viewMode={viewMode}
                selectedObjects={selectedObjects}
                onClearSelection={clearSelection}
              />
            </ErrorBoundary>
          </div>
        </section>
      </main>

      <footer style={{
        padding: '0.5rem 2rem',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        gap: '1rem'
      }}>
        <div>
          <button
            className="btn btn-ghost"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '4px' }}
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user?.groups?.some((g: any) => ['group_security', 'group_platform_admins'].includes(g)) && (
            <button
              className="btn btn-ghost"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '4px' }}
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Settings size={16} />
            </button>
          )}
          Developed with AI
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--glass-border)'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>System Configuration</h2>
              <button
                className="btn btn-ghost"
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)'
                }}
                onClick={() => setShowSettings(false)}
                title="Close Settings"
              >
                <X size={24} />
              </button>
            </div>
            <AdminSettings />
          </div>
        </div>
      )}
    </div>
  );
};

const ViewModeTabs = ({ viewMode, setViewMode, pendingCount, errorCount, user }: any) => {
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
        <TabButton
          viewMode={viewMode}
          mode="AUDIT"
          setViewMode={setViewMode}
          label="Audit Log"
          badge={null}
        />
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
      {badge && (
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
    default:
      return null;
  }
};

export default MainLayout;