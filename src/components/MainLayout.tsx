import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldCheck, X, Settings, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './Sidebar';
import { CatalogService } from '../services/catalog/CatalogService';
import { StorageService } from '../services/storage/StorageService';
import { ViewModeTabs, UserControls, ContentView, ComponentLoader } from './OptimizedComponents';
import { lazy } from 'react';
const AdminSettings = lazy(() => import('./AdminSettings'));

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [catalogs, setCatalogs] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState('REVIEWER');
  const [pendingCount] = useState(0);
  const [errorCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const savedWidth = localStorage.getItem('acs_sidebar_width');
    const savedCollapsed = localStorage.getItem('acs_sidebar_collapsed');
    
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
    if (savedCollapsed) {
      setIsSidebarCollapsed(savedCollapsed === 'true');
    }

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
    return undefined;
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const config = StorageService.getConfig();
        if (config.ucAuthType === 'ACCOUNT') {
          setLoadingWorkspaces(true);
          setWorkspaceError(null);
          const workspaceData = await CatalogService.fetchWorkspaces();
          setWorkspaces(workspaceData || []);
          
          if (!selectedWorkspaceId && workspaceData?.length > 0) {
            setSelectedWorkspaceId(workspaceData[0].id);
          }
        } else if (config.ucAuthType === 'WORKSPACE') {
          if (!selectedWorkspaceId) {
            setSelectedWorkspaceId('default_workspace');
          }
        } else {
          if (!selectedWorkspaceId) {
            setSelectedWorkspaceId('default_workspace');
          }
        }
      } catch (error) {
        setWorkspaceError((error as Error).message || 'Failed to load workspaces');
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

  useEffect(() => {
    const loadCatalogs = async () => {
      if (!user) return;
      
      try {
        const config = StorageService.getConfig();
        
        if (config.ucAuthType === 'WORKSPACE' || selectedWorkspaceId) {
          const catalogData = await CatalogService.fetchCatalogs(selectedWorkspaceId || 'workspace');
          setCatalogs(catalogData || []);
        }
      } catch (error) {
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

  const handleToggleSelection = useCallback((id: any, node: any) => {
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

  const sidebarStyles = useMemo(() => ({
    width: isSidebarCollapsed ? 0 : sidebarWidth,
    minWidth: isSidebarCollapsed ? 0 : 150,
    maxWidth: isSidebarCollapsed ? 0 : 600,
    transition: isResizing ? 'none' : 'width 0.2s ease',
    flexShrink: 0,
    position: (isSidebarCollapsed ? 'absolute' : 'relative') as 'absolute' | 'relative',
    left: isSidebarCollapsed ? '5px' : '0'
  }), [isSidebarCollapsed, sidebarWidth, isResizing]);

  const mainContentStyles = useMemo(() => ({
    display: 'flex',
    flex: 1,
    position: 'relative' as 'relative',
    overflow: 'hidden'
  }), []);

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

      <main style={mainContentStyles}>
        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          <div style={sidebarStyles}>
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
            <React.Suspense fallback={<ComponentLoader />}>
              <AdminSettings />
            </React.Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;