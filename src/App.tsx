
import { useAuth, AuthProvider } from './context/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/layout/MainLayout';
import Login from './components/layout/Login';
import RequireAuth from './components/layout/RequireAuth';
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
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{
          error: {
            duration: Infinity,
          },
        }}
      />
    </ErrorBoundary>
  );
}

export default App;
