
import { useAuth, AuthProvider } from './context/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import RequireAuth from './components/RequireAuth';
import './index.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isFullyAuthenticated = user && !user.requiresUserSelection;
  
  if (!isFullyAuthenticated) {
    return <Login />;
  }
  
  return (
    <RequireAuth>
      <MainLayout />
    </RequireAuth>
  );
};

import { Toaster } from 'sonner';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </ErrorBoundary>
  );
}

export default App;
