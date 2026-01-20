import React, { createContext, useState, useContext, useEffect } from 'react';
import { MOCK_IDENTITIES } from '../services/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for session
        const storedUser = localStorage.getItem('uc_auth_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (provider) => {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        let mockUser;

        // Simulate mapping different Identity Providers to internal users
        switch (provider) {
            case 'GOOGLE': // OAuth
                mockUser = { ...MOCK_IDENTITIES.users[0], provider: 'Google Workspace', avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=random' };
                break;
            case 'MICROSOFT': // Active Directory
                mockUser = { ...MOCK_IDENTITIES.users[2], provider: 'Azure AD', avatar: 'https://ui-avatars.com/api/?name=Carol+CFO&background=0078d4&color=fff' }; // CFO
                break;
            case 'SAML': // Generic SAML
                mockUser = { ...MOCK_IDENTITIES.users[4], provider: 'Okta (SAML)', avatar: 'https://ui-avatars.com/api/?name=Dave+Developer&background=random' }; // Developer
                break;
            default:
                mockUser = { ...MOCK_IDENTITIES.users[1], provider: 'Guest', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=random' };
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
