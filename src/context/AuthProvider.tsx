import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { IdentityService } from '../services/identity/IdentityService';
import { AuthContextType, User } from './AuthContext';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                console.log('[AuthProvider] Initializing auth...');
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
                    // Try to get selected mock user from localStorage
                    try {
                        const storedUser = localStorage.getItem('mock_current_user');
                        if (storedUser) {
                            const selectedUser = JSON.parse(storedUser);
                            console.log('[AuthProvider] Found selected user:', selectedUser);
                            setUser(selectedUser);
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

    const login = async (provider: string): Promise<User> => {
        try {
            const currentUser = await IdentityService.login(provider);
            setUser(currentUser);
            return currentUser;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        IdentityService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
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
