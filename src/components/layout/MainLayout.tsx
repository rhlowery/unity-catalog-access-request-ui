import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthProvider';
import ErrorBoundary from '../common/ErrorBoundary';
import Sidebar from './Sidebar';
import { CatalogService } from '../../services/catalog/CatalogService';
import { StorageService } from '../../services/storage/StorageService';
import { ConfigService } from '../../services/config/ConfigService';
import { useQuery } from '@tanstack/react-query';
import { ContentView } from './OptimizedComponents';
import { EventBus } from '../../services/EventBus';
import { usePersona } from '../../hooks/usePersona';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { ConfigDialog } from './ConfigDialog';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');

  const {
    data: workspaces = [],
    isLoading: loadingWorkspaces,
    error: workspaceErrorData
  } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => CatalogService.fetchWorkspaces(),
    enabled: !!user
  });

  const workspaceError = workspaceErrorData ? (workspaceErrorData as Error).message : null;

  const {
    data: catalogs = [],
  } = useQuery({
    queryKey: ['catalogs', selectedWorkspaceId],
    queryFn: () => CatalogService.fetchCatalogs(selectedWorkspaceId),
    enabled: !!user && !!selectedWorkspaceId
  });

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState('REVIEWER');
  const [treeData, setTreeData] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sync initial catalogs into tree state
  useEffect(() => {
    if (catalogs && catalogs.length > 0 && !isSearching) {
      setTreeData(catalogs);
    }
  }, [catalogs, isSearching]);

  const handleExpand = useCallback(async (node: any) => {
    if (!selectedWorkspaceId) return;

    if (node.type === 'CATALOG') {
      const { items } = await CatalogService.fetchSchemas(selectedWorkspaceId, node.name);
      setTreeData(prev => {
        const updateChildren = (list: any[]): any[] => {
          return list.map(item => {
            if (item.id === node.id) {
              return { ...item, children: items };
            }
            if (item.children) {
              return { ...item, children: updateChildren(item.children) };
            }
            return item;
          });
        };
        return updateChildren(prev);
      });
    } else if (node.type === 'SCHEMA') {
      const [catalogName, schemaName] = node.id.split('.');
      const { items } = await CatalogService.fetchTables(selectedWorkspaceId, catalogName, schemaName);
      setTreeData(prev => {
        const updateChildren = (list: any[]): any[] => {
          return list.map(item => {
            if (item.id === node.id) {
              return { ...item, children: items };
            }
            if (item.children) {
              return { ...item, children: updateChildren(item.children) };
            }
            return item;
          });
        };
        return updateChildren(prev);
      });
    }
  }, [selectedWorkspaceId]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setIsSearching(false);
      setTreeData(catalogs || []);
      return;
    }

    setIsSearching(true);
    const results = await CatalogService.searchCatalog(selectedWorkspaceId, query);
    setTreeData(results.map((r: any) => ({
      id: `${r.catalog_name}.${r.schema_name}.${r.name}`,
      name: r.name,
      type: r.table_type || 'TABLE',
      catalog: r.catalog_name,
      schema: r.schema_name
    })));
  }, [selectedWorkspaceId, catalogs]);

  const [pendingCount] = useState(0);
  const [errorCount] = useState(0);

  // Resolve the user's effective persona and tab capabilities
  const persona = usePersona(user);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_config, setConfig] = useState(() => ConfigService.getConfig());

  useEffect(() => {
    const handler = (data: any) => setConfig(data.config);
    const storageHandler = () => setConfig(ConfigService.getConfig());

    EventBus.on('SETTINGS_UPDATED', handler);
    window.addEventListener('storage', storageHandler);

    return () => {
      EventBus.remove('SETTINGS_UPDATED', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

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
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    } else if (workspaces.length === 0 && !selectedWorkspaceId) {
      const config = ConfigService.getConfig();
      if (config.ucAuthType === 'WORKSPACE' || config.ucAuthType === 'LOCAL' || !config.ucAuthType) {
        setSelectedWorkspaceId('default_workspace');
      }
    }
  }, [workspaces, selectedWorkspaceId]);

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

  const handleSubmitRequest = useCallback(async (request: any) => {
    try {
      const success = await StorageService.createRequest(request);
      if (success) {
        window.alert("Access request submitted successfully!");
        clearSelection();
        setViewMode('REVIEWER');
      } else {
        window.alert("Failed to submit access request.");
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      window.alert("An error occurred while submitting the request.");
    }
  }, [clearSelection]);

  const sidebarStyles = useMemo(() => ({
    width: isSidebarCollapsed ? 0 : sidebarWidth,
    minWidth: isSidebarCollapsed ? 0 : 150,
    maxWidth: isSidebarCollapsed ? 0 : 600,
    height: '100%',
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
    <div id="app-root" className="h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans">
      <AppHeader
        isSidebarCollapsed={isSidebarCollapsed}
        isMobile={isMobile}
        sidebarWidth={sidebarWidth}
        handleToggle={handleToggle}
        viewMode={viewMode}
        setViewMode={setViewMode}
        pendingCount={pendingCount}
        errorCount={errorCount}
        user={user}
        persona={{ ...persona, logout }}
      />

      <main style={mainContentStyles}>
        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          <div style={sidebarStyles}>
            <ErrorBoundary>
              <Sidebar
                catalogs={treeData}
                selectedIds={selectedIds}
                onToggleSelection={handleToggleSelection}
                onExpand={handleExpand}
                onSearch={handleSearch}
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
                width: '1px',
                flexShrink: 0,
                background: isResizing ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.05)',
                cursor: 'col-resize',
                position: 'relative',
                transition: isResizing ? 'none' : 'background 0.3s ease'
              }}
              onMouseDown={handleResizeStart}
              className="main-splitter group"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-transparent group-hover:bg-primary/20 rounded-full transition-all flex items-center justify-center">
                <div className="w-0.5 h-3 bg-white/20 rounded-full" />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 overflow-hidden relative">
            <div className="h-full overflow-y-auto custom-scrollbar bg-background/20 backdrop-blur-[2px] transition-all p-8">
              <div className="min-h-full flex flex-col items-center w-full">
                <div className="max-w-6xl w-full">
                  <ErrorBoundary>
                    <ContentView
                      viewMode={viewMode}
                      selectedObjects={selectedObjects}
                      onClearSelection={clearSelection}
                      onSubmit={handleSubmitRequest}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            width: '5px',
            flexShrink: 0,
            background: 'transparent'
          }} />
        </div>
      </main>

      <AppFooter
        canAccessSettings={persona.canAccessSettings}
        setShowSettings={setShowSettings}
      />

      <ConfigDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </div>
  );
};

export default MainLayout;