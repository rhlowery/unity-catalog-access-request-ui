import React, { createContext, useState, useContext, useEffect } from 'react';
import { IdentityService } from '../services/identity/IdentityService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check for stored session
            const storedUser = localStorage.getItem('uc_auth_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
                setLoading(false);
                return;
            }

            // 2. Try to get user from Identity Provider (e.g. SSO)
            try {
                const adapterUser = await IdentityService.getCurrentUser();
                if (adapterUser) {
                    setUser(adapterUser);
                    localStorage.setItem('uc_auth_user', JSON.stringify(adapterUser));
                }
            } catch (e) {
                console.error("Failed to get current user from adapter:", e);
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (provider) => {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        let mockUser;
        const identities = await IdentityService.fetchIdentities();

        // Simulate mapping different Identity Providers to internal users
        switch (provider) {
            case 'GOOGLE': // OAuth
                mockUser = { ...identities.users[0], provider: 'Google Workspace', initials: 'AJ', groups: ['group_data_scientists'] };
                break;
            case 'MICROSOFT': // Active Directory
                mockUser = { ...identities.users[2], provider: 'Azure AD', initials: 'CC', groups: ['group_finance_admins'] }; // CFO
                break;
            case 'SAML': // Generic SAML
                mockUser = { ...identities.users[4], provider: 'Okta (SAML)', initials: 'DD', groups: ['group_engineering'] }; // Developer
                break;
            case 'ADMIN': // Security Admin
                mockUser = { id: 'user_admin', name: 'Sarah Security', email: 'sarah@example.com', type: 'USER', provider: 'Internal Auth', initials: 'SS', groups: ['group_security', 'group_platform_admins'] };
                break;
            default:
                mockUser = { ...identities.users[1], provider: 'Guest', initials: 'BS', groups: [] };
        }

        localStorage.setItem('uc_auth_user', JSON.stringify(mockUser));
        setUser(mockUser);
        setLoading(false);
    };

    const logout = () => {
        localStorage.removeItem('uc_auth_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
