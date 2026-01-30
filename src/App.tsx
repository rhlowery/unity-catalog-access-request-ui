
import { useAuth, AuthProvider } from './context/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';
import Login from './components/Login';
import './index.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <MainLayout /> : <Login />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
