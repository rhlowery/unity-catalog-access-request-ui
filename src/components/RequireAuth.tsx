import { ReactNode } from 'react';
import { useAuth } from '../context/AuthProvider';
import Login from './Login';

interface RequireAuthProps {
  children: ReactNode;
  requiredRole?: string;
}

const RequireAuth = ({ children, requiredRole }: RequireAuthProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
      }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const isAuthenticated = user && !user.requiresUserSelection;

  if (!isAuthenticated) {
    return <Login />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          You do not have the required role to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
