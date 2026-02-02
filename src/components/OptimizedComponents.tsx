import React, { lazy, Suspense } from 'react';
import { LogOut } from 'lucide-react';

// Lazy load components that are not immediately needed
const AccessForm = lazy(() => import('./AccessForm'));
const ApproverDashboard = lazy(() => import('./ApproverDashboard'));
const ReviewerTab = lazy(() => import('./ReviewerTab'));
const AuditLog = lazy(() => import('./AuditLog'));
const AdminSettings = lazy(() => import('./AdminSettings'));

// Loading fallback component
const ComponentLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '200px',
    color: 'var(--text-secondary)'
  }}>
    Loading...
  </div>
);

// Memoized tab components to prevent unnecessary re-renders
const ViewModeTabs = React.memo(({ viewMode, setViewMode, pendingCount, errorCount, user }: any) => {
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
});

const TabButton = React.memo(({ viewMode, mode, setViewMode, label, badge }: any) => {
  const isActive = viewMode === mode;
  const handleClick = React.useCallback(() => setViewMode(mode), [setViewMode, mode]);
  
  return (
    <button
      className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
      style={!isActive ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}}
      onClick={handleClick}
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
});

const UserControls = React.memo(({ user, logout }: { user?: any; logout?: () => void }) => (
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
));

const ContentView = React.memo(({ viewMode, selectedObjects, onClearSelection }: any) => {
  const content = React.useMemo(() => {
    switch (viewMode) {
      case 'CHANGE_REQUEST':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <AccessForm selectedObjects={selectedObjects} onClearSelection={onClearSelection} />
          </Suspense>
        );
      case 'REVIEWER':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <ReviewerTab selectedObject={selectedObjects.length > 0 ? selectedObjects[selectedObjects.length - 1] : null} />
          </Suspense>
        );
      case 'APPROVER':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <ApproverDashboard />
          </Suspense>
        );
      case 'AUDIT':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <AuditLog />
          </Suspense>
        );
      default:
        return null;
    }
  }, [viewMode, selectedObjects, onClearSelection]);

  return content;
});

export { ViewModeTabs, UserControls, ContentView, AdminSettings, ComponentLoader };