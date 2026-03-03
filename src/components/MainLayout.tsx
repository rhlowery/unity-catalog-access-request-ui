import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldCheck, X, Settings, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './Sidebar';
import { CatalogService } from '../services/catalog/CatalogService';
import { StorageService } from '../services/storage/StorageService';
import { ConfigService } from '../services/config/ConfigService';
import { useQuery } from '@tanstack/react-query';
import { ViewModeTabs, UserControls, ContentView, ComponentLoader } from './OptimizedComponents';
import { lazy } from 'react';
const AdminSettings = lazy(() => import('./AdminSettings'));

import { ModeToggle } from './ModeToggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';

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
    isLoading: _loadingCatalogs
  } = useQuery({
    queryKey: ['catalogs', selectedWorkspaceId],
    queryFn: () => CatalogService.fetchCatalogs(selectedWorkspaceId),
    enabled: !!user && !!selectedWorkspaceId
  });

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
      <header className="flex items-center h-16 border-b border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div
          className="flex items-center px-8 shrink-0 transition-all duration-200 overflow-hidden"
          style={{ width: isSidebarCollapsed ? (isMobile ? 80 : 0) : sidebarWidth }}
        >
          <div className="flex items-center min-w-max">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={handleToggle} title="Toggle Sidebar" className="mr-2">
                <Menu size={20} />
              </Button>
            )}
            <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
              <ShieldCheck size={24} className="text-primary" />
            </div>
            {(!isSidebarCollapsed || isMobile) && (
              <h1 className="ml-4 text-lg font-extrabold tracking-tight text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                Access Control System
              </h1>
            )}
          </div>
        </div>

        <div className="flex-1 flex relative items-center h-full px-8">
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="pointer-events-auto">
              <ViewModeTabs viewMode={viewMode} setViewMode={setViewMode} pendingCount={pendingCount} errorCount={errorCount} user={user} />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4 relative z-10">
            <ModeToggle />
            <UserControls user={user} logout={logout} />
          </div>
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

      <footer className="py-3 px-8 border-t border-white/5 bg-background/40 flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">
        <div className="flex items-center gap-6">
          <span className="opacity-70">v2.4.0</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
            <span className="opacity-70">Backend: Online</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={16} />
          </Button>
          <span className="opacity-60">Unity Catalog Access Request UI</span>
        </div>
      </footer>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-border bg-background/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold tracking-tight">System Configuration</DialogTitle>
            <DialogDescription>
              Manage your identity, storage, and Unity Catalog integration settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <React.Suspense fallback={<ComponentLoader />}>
              <AdminSettings />
            </React.Suspense>
          </div>
          <div className="p-4 border-t border-border bg-background/50 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainLayout;