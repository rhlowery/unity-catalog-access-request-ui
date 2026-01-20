import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, User as UserIcon } from 'lucide-react'; // Renamed User to UserIcon for clarity
import { AuthProvider, useAuth } from './context/AuthContext';
import CatalogTree from './components/CatalogTree';
import AccessForm from './components/AccessForm';
import ApproverDashboard from './components/ApproverDashboard';
import AuditLog from './components/AuditLog';
import Login from './components/Login';
import { getCatalogs, getRequests } from './services/mockData';
import './index.css';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [catalogs, setCatalogs] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [viewMode, setViewMode] = useState('REQUESTER');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getCatalogs().then(setCatalogs);

    // Poll for pending requests count (simple implementation)
    const checkPending = async () => {
      const reqs = await getRequests();
      // Since we don't know the exact active persona here, we just check if *any* request is pending globally
      // or check for specific user. But the requirement implies "requests THEY need to approve".
      // For simplicity in this mock/demo, we'll sum up pending for ANY of the standard mock personas 
      // OR ideally, we'd know the user's groups.
      // Let's count *total* pending requests for now as a signal to check the dashboard.
      // Refinement: We can check if `user.id` or their groups are in `approvalState` as PENDING.
      // Mock simplification: We will just count ALL pending requests to prompt action.
      const pending = reqs.filter(r => r.status === 'PENDING').length;
      setPendingCount(pending);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [user]);

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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Unity Access Manager</h1>
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
            {user?.groups?.some(g => ['group_security', 'group_platform_admins'].includes(g)) && (
              <button
                className={`btn ${viewMode === 'AUDIT' ? 'btn-primary' : 'btn-ghost'}`}
                style={viewMode !== 'AUDIT' ? { border: 'none', background: 'transparent', color: 'var(--text-secondary)' } : {}}
                onClick={() => setViewMode('AUDIT')}
              >
                Audit Log
              </button>
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
        <aside className="glass-panel" style={{
          width: '300px',
          margin: '0 0 1rem 1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Data Catalog
            </h3>
          </div>
          <CatalogTree
            nodes={catalogs}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
          />
        </aside>

        <section style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
          {viewMode === 'REQUESTER' && (
            <AccessForm
              selectedObjects={selectedObjects}
              onClearSelection={clearSelection}
            />
          )}
          {viewMode === 'APPROVER' && <ApproverDashboard />}
          {viewMode === 'AUDIT' && <AuditLog />}
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
