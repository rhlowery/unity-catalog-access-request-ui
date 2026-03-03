
import { useAuth, AuthProvider } from './context/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import './index.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  // If user is logged in but hasn't selected a persona (mock mode), 
  // we still want to show the login/selection screen.
  const isFullyAuthenticated = user && !user.requiresUserSelection;
  return isFullyAuthenticated ? <MainLayout /> : <Login />;
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
