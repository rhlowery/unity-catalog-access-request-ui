import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { IdentityService } from '../services/identity/IdentityService';
import { SessionManager } from '../services/session/SessionManager';
import { AuthContextType, User } from './AuthContext';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionWarning, setSessionWarning] = useState<any>(null);
    const [sessionExpired, setSessionExpired] = useState<any>(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                console.log('[AuthProvider] Initializing auth with session management...');
                
                // Check for existing valid session
                const activeSession = SessionManager.getActiveSession();
                if (activeSession) {
                    console.log('[AuthProvider] Found active session:', activeSession);
                    const userFromSession = {
                        id: activeSession.userId,
                        name: activeSession.userName,
                        email: `${activeSession.userName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                        groups: activeSession.userGroups,
                        provider: activeSession.provider,
                        initials: activeSession.userName.split(' ').map(n => n[0]).join(''),
                        type: 'USER'
                    };
                    
                    setUser(userFromSession);
                    setLoading(false);
                    
                    // Start session monitoring
                    SessionManager.checkSessionExpiration(activeSession.id);
                    return;
                }
                
                // No valid session - try identity service
                const adapter = IdentityService.getAdapter();
                console.log('[AuthProvider] Using adapter:', adapter.name);
                
                const currentUser = await IdentityService.getCurrentUser();
                console.log('[AuthProvider] Current user from identity service:', currentUser);
                
                // Check if this is mock identity with user selection
                if (currentUser?.requiresUserSelection) {
                    console.log('[AuthProvider] Mock user selection required');
                    setUser(currentUser);
                    setLoading(false);
                    return;
                }
                
                // For mock provider, check if there's a selected user in localStorage
                if (currentUser?.id === 'user_selection') {
                    try {
                        const storedUser = localStorage.getItem('mock_current_user');
                        if (storedUser) {
                            const selectedUser = JSON.parse(storedUser);
                            console.log('[AuthProvider] Found selected user:', selectedUser);
                            setUser(selectedUser);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.log('[AuthProvider] No selected user found in localStorage');
                    }
                }
                
                console.log('[AuthProvider] Setting current user:', currentUser);
                setUser(currentUser);
            } catch (error) {
                console.error('Auth initialization error:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    useEffect(() => {
        // Set up session event listeners
        const handleSessionExpiring = (event: CustomEvent) => {
            console.log('[AuthProvider] Session expiring:', event.detail);
            setSessionWarning(event.detail);
        };

        const handleSessionExpired = (event: CustomEvent) => {
            console.log('[AuthProvider] Session expired:', event.detail);
            setSessionExpired(event.detail);
            setUser(null);
        };

        window.addEventListener('sessionExpiring', handleSessionExpiring as EventListener);
        window.addEventListener('sessionExpired', handleSessionExpired as EventListener);

        return () => {
            window.removeEventListener('sessionExpiring', handleSessionExpiring as EventListener);
            window.removeEventListener('sessionExpired', handleSessionExpired as EventListener);
        };
    }, []);

    const login = async (provider: string): Promise<User> => {
        try {
            console.log(`[AuthProvider] Attempting login with provider: ${provider}`);
            
            // Get identity and create session
            const currentUser = await IdentityService.login(provider);
            
            // Create session with tokens (mock tokens for now)
            const tokens = {
                accessToken: `token_${Date.now()}`,
                refreshToken: `refresh_${Date.now()}`
            };
            
            const session = await SessionManager.createSession(currentUser, provider, tokens);
            console.log('[AuthProvider] Session created:', session);
            
            setUser(currentUser);
            
            // Track activity for new session
            SessionManager.trackActivity(session.id);
            
            return currentUser;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('[AuthProvider] Logging out...');
            
            const activeSession = SessionManager.getActiveSession();
            if (activeSession) {
                await SessionManager.destroySession(activeSession.id);
            }
            
            // Also call identity service logout
            IdentityService.logout();
            
            setUser(null);
            setSessionWarning(null);
            setSessionExpired(null);
            
            // Clear any remaining mock data
            if (localStorage.getItem('mock_current_user')) {
                localStorage.removeItem('mock_current_user');
            }
        } catch (error) {
            console.error('Logout error:', error);
            setUser(null);
        }
    };

    const dismissSessionWarning = () => {
        setSessionWarning(null);
    };

    const dismissSessionExpired = () => {
        setSessionExpired(null);
    };

    const sessionExpiringHandler = (data: any) => {
        setSessionWarning(data);
    };

    const sessionExpiredHandler = (data: any) => {
        setSessionExpired(data);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            login, 
            logout,
            sessionExpiring: sessionExpiringHandler,
            sessionExpired: sessionExpiredHandler
        }}>
            {children}
            
            {/* Session Warning Modal */}
            {sessionWarning && (
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
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--border-radius)',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ color: 'var(--warning)', marginBottom: '1rem' }}>
                            Session Expiring Soon
                        </h3>
                        <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                            {sessionWarning.message}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={dismissSessionWarning}
                            >
                                Continue
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => {
                                    dismissSessionWarning();
                                    login(sessionWarning.session.provider);
                                }}
                            >
                                Renew Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Expired Modal */}
            {sessionExpired && (
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
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--border-radius)',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
                            Session Expired
                        </h3>
                        <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                            {sessionExpired.message}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={dismissSessionExpired}
                            >
                                Login Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { useAuth };