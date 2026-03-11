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
                console.log('[AuthProvider] Initializing auth via Zero-Trust verify...');

                // 1. Try to get verified identity from the BFF session cookie directly
                const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
                try {
                    const response = await fetch(`${BFF_URL}/api/auth/me`, {
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const verifiedUser = await response.json();
                        console.log('[AuthProvider] Found verified BFF session:', verifiedUser);

                        const contextUser = {
                            ...verifiedUser,
                            initials: verifiedUser.name.split(' ').map((n: string) => n[0]).join(''),
                            type: 'USER'
                        };

                        setUser(contextUser);
                        setLoading(false);

                        // Check local session for expiry tracking
                        const activeSession = await SessionManager.getActiveSession();
                        if (activeSession) {
                            await SessionManager.checkSessionExpiration(activeSession.id);
                        }
                        return;
                    }
                } catch (e) {
                    console.warn('[AuthProvider] BFF offline, falling back to local session lookup');
                }

                // 2. Fallback to existing persistent session (useful for offline/mock)
                const activeSession = await SessionManager.getActiveSession();
                if (activeSession) {
                    console.log('[AuthProvider] Found active local session, synchronizing with BFF:', activeSession);

                    const userFromSession = {
                        id: activeSession.userId,
                        name: activeSession.userName,
                        email: activeSession.userEmail || `${activeSession.userId}@local`,
                        groups: activeSession.userGroups || [],
                        role: activeSession.userRole || 'STANDARD_USER',
                        provider: activeSession.provider,
                        initials: activeSession.userName.split(' ').map(n => n[0]).join(''),
                        type: 'USER'
                    };

                    // Proactively attempt to establish BFF session for this local user
                    try {
                        await fetch(`${BFF_URL}/api/auth/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                userId: userFromSession.id,
                                userName: userFromSession.name,
                                email: userFromSession.email,
                                groups: userFromSession.groups,
                                role: userFromSession.role,
                                provider: activeSession.provider || 'MOCK'
                            })
                        });
                    } catch (err) {
                        console.warn('[AuthProvider] Failed to sync local session to BFF:', err);
                    }

                    setUser(userFromSession);
                    setLoading(false);
                    return;
                }

                // 3. No valid session - try identity service
                const adapter = IdentityService.getAdapter();
                console.log('[AuthProvider] Using adapter:', adapter.name);

                const currentUser = await IdentityService.getCurrentUser();
                console.log('[AuthProvider] Current user from identity service:', currentUser);

                // For mock provider, if we have a placeholder "user_selection" object,
                // it means we still need to select a specific persona.
                if (currentUser?.id === 'user_selection' || currentUser?.requiresUserSelection) {
                    console.log('[AuthProvider] Identity requires user selection');
                    setUser(currentUser);
                    setLoading(false);
                    return;
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

    const login = async (provider: string, credentials?: any): Promise<User> => {
        try {
            console.log(`[AuthProvider] Attempting login with provider: ${provider}`);

            // 1. Resolve identity via the configured identity adapter
            const currentUser = await IdentityService.login(provider, credentials);

            // If this is a mock provider and it requires selection, don't create a session yet
            if (currentUser.requiresUserSelection) {
                console.log('[AuthProvider] Login requires further selection, skipping session creation');
                setUser(currentUser);
                return currentUser;
            }

            // 2. Exchange the resolved identity for a BFF-signed JWT
            const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
            let bffExpiresAt: number | undefined;
            let bffToken: string | undefined;

            try {
                const jwtRes = await fetch(`${BFF_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Important: stores bff_jwt HttpOnly cookie
                    body: JSON.stringify({
                        userId: currentUser.id,
                        userName: currentUser.name,
                        email: currentUser.email,
                        groups: currentUser.groups || [],
                        role: currentUser.role || 'STANDARD_USER',
                        provider,
                    }),
                });

                if (jwtRes.ok) {
                    const jwtData = await jwtRes.json();
                    bffExpiresAt = jwtData.expiresAt;
                    bffToken = jwtData.token;
                    console.log('[AuthProvider] BFF JWT issued, expires:', new Date(bffExpiresAt!).toISOString());
                } else {
                    console.warn('[AuthProvider] BFF JWT issuance failed, falling back to local session');
                }
            } catch (jwtErr) {
                // BFF may not be running in offline/test mode — gracefully degrade
                console.warn('[AuthProvider] Could not reach BFF for JWT issuance:', jwtErr);
            }

            // 3. Create frontend session (cookies manage the actual secrets)
            const tokens = {
                expiresAt: bffExpiresAt,
                // We no longer store tokens in localStorage for security
            };

            const session = await SessionManager.createSession(currentUser, provider, tokens);
            console.log('[AuthProvider] Session created:', session.id);

            setUser(currentUser);

            // Track activity for new session
            await SessionManager.trackActivity(session.id);

            return currentUser;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('[AuthProvider] Logging out...');

            const activeSession = await SessionManager.getActiveSession();
            if (activeSession) {
                await SessionManager.destroySession(activeSession.id);
            }

            // Clear BFF-side HttpOnly cookies (bff_jwt + access_token)
            const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
            await fetch(`${BFF_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            }).catch(() => { /* Non-critical: BFF may be offline */ });

            // Also call identity service logout
            await IdentityService.logout();

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
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title warning">
                            Session Expiring Soon
                        </h3>
                        <p className="modal-body">
                            {sessionWarning.message}
                        </p>
                        <div className="modal-actions">
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
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title danger">
                            Session Expired
                        </h3>
                        <p className="modal-body">
                            {sessionExpired.message}
                        </p>
                        <div className="modal-actions">
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