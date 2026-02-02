import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, LogOut, X, CheckCircle, AlertCircle, Shield, Settings, PanelLeftOpen, PanelLeftClose, Menu } from 'lucide-react';
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
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedWidth = localStorage.getItem('acs_sidebar_width');
    const savedCollapsed = localStorage.getItem('acs_sidebar_collapsed');
    
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
    if (savedCollapsed) {
      setIsSidebarCollapsed(savedCollapsed === 'true');
    }

    // Mobile responsiveness
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('acs_sidebar_width', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isResizing, sidebarWidth]);

  // Load workspaces when component mounts or auth changes
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const config = StorageService.getConfig();
        console.log('[MainLayout] Config loaded:', config);
        if (config.ucAuthType === 'ACCOUNT') {
          console.log('[MainLayout] Loading workspaces for ACCOUNT mode');
          setLoadingWorkspaces(true);
          setWorkspaceError(null);
          const workspaceData = await CatalogService.fetchWorkspaces();
          console.log('[MainLayout] Workspace data:', workspaceData);
          setWorkspaces(workspaceData || []);
          
          // Set first workspace as default if none selected
          if (!selectedWorkspaceId && workspaceData?.length > 0) {
            console.log('[MainLayout] Setting default workspace:', workspaceData[0].id);
            setSelectedWorkspaceId(workspaceData[0].id);
          }
        } else if (config.ucAuthType === 'WORKSPACE') {
          console.log('[MainLayout] In WORKSPACE mode, using default workspace');
          // In workspace mode, set a default workspace ID to trigger catalog loading
          if (!selectedWorkspaceId) {
            setSelectedWorkspaceId('default_workspace');
          }
        } else {
          console.log('[MainLayout] Unknown auth mode, setting default workspace');
          if (!selectedWorkspaceId) {
            setSelectedWorkspaceId('default_workspace');
          }
        }
      } catch (error) {
        console.error('Error loading workspaces:', error);
        setWorkspaceError(error.message || 'Failed to load workspaces');
        // Set default workspace even on error
        if (!selectedWorkspaceId) {
          setSelectedWorkspaceId('default_workspace');
        }
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    if (user) {
      loadWorkspaces();
    }
  }, [user, selectedWorkspaceId]);

  // Load catalogs when workspace changes or user logs in
  useEffect(() => {
    const loadCatalogs = async () => {
      if (!user) {
        console.log('[MainLayout] No user, skipping catalog load');
        return;
      }
      
      try {
        const config = StorageService.getConfig();
        console.log('[MainLayout] Loading catalogs, config:', config);
        
        // In WORKSPACE mode, we can load catalogs directly without workspace ID
        // In ACCOUNT mode, wait for workspace selection
        if (config.ucAuthType === 'WORKSPACE' || selectedWorkspaceId) {
          console.log('[MainLayout] Loading catalogs for workspace:', selectedWorkspaceId || 'WORKSPACE mode');
          const catalogData = await CatalogService.fetchCatalogs(selectedWorkspaceId || 'workspace');
          console.log('[MainLayout] Catalog data received:', catalogData);
          setCatalogs(catalogData || []);
        } else {
          console.log('[MainLayout] Waiting for workspace selection in ACCOUNT mode');
        }
      } catch (error) {
        console.error('Error loading catalogs:', error);
        setCatalogs([]);
      }
    };

    loadCatalogs();
  }, [user, selectedWorkspaceId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedObjects([]);
  }, []);



  const handleToggle = useCallback(() => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    localStorage.setItem('acs_sidebar_collapsed', newCollapsed ? 'true' : 'false');
  }, [isSidebarCollapsed]);

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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(150, Math.min(600, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('acs_sidebar_width', sidebarWidth.toString());
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

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
          {isMobile && (
            <button
              className="btn btn-ghost"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', padding: '4px' }}
              onClick={handleToggle}
              title="Toggle Sidebar"
            >
              <Menu size={24} />
            </button>
          )}
          <ShieldCheck size={24} color="var(--accent-color)" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Access Control System</h1>
        </div>

        <div className="flex-center" style={{ gap: '16px' }}>
          <ViewModeTabs viewMode={viewMode} setViewMode={setViewMode} pendingCount={pendingCount} errorCount={errorCount} user={user} />
          <UserControls user={user} logout={logout} />
        </div>
      </header>

      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          {/* First panel: Collapsible Sidebar */}
          <div style={{
            width: isSidebarCollapsed ? 0 : sidebarWidth,
            minWidth: isSidebarCollapsed ? 0 : 150,
            maxWidth: isSidebarCollapsed ? 0 : 600,
            transition: isResizing ? 'none' : 'width 0.2s ease',
            flexShrink: 0,
            position: isSidebarCollapsed ? 'absolute' : 'relative',
            left: isSidebarCollapsed ? '5px' : '0'
          }}>
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

            {/* Sidebar resize handle when not collapsed and not mobile */}
            {!isSidebarCollapsed && !isMobile && (
              <div
                style={{
                  position: 'absolute',
                  right: '-5px',
                  width: '4px',
                  height: '100%',
                  cursor: 'col-resize',
                  background: isResizing ? 'var(--accent-color)' : 'transparent',
                  zIndex: 10,
                  transition: 'background 0.2s ease'
                }}
                onMouseDown={handleResizeStart}
                className="sidebar-resize-handle"
              />
            )}
          </div>

          {/* Virtual MovableSplitter between sidebar and main panels - hidden on mobile */}
          {!isMobile && (
            <div
              style={{
                width: '5px',
                flexShrink: 0,
                background: isResizing ? 'var(--accent-color)' : 'var(--glass-border)',
                cursor: 'col-resize',
                position: 'relative',
                transition: isResizing ? 'none' : 'background 0.2s ease, transform 0.1s ease'
              }}
              onMouseDown={handleResizeStart}
              className="main-splitter"
              onMouseEnter={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.background = 'var(--accent-color)';
                  e.currentTarget.style.transform = 'scaleX(1.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.background = 'var(--glass-border)';
                  e.currentTarget.style.transform = 'scaleX(1)';
                }
              }}
            />
          )}

          {/* Second panel: Main content */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="glass-panel" style={{
              width: '100%',
              height: '100%',
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
          </div>

          {/* Third panel: Fixed 5px buffer to browser edge */}
          <div style={{ 
            width: '5px',
            flexShrink: 0,
            background: 'transparent'
          }} />
        </div>
      </main>

      <footer style={{
        padding: '0.5rem 2rem',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: '4px' }}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={16} />
          </button>
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