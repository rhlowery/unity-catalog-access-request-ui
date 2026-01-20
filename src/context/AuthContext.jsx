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
                mockUser = { ...MOCK_IDENTITIES.users[0], provider: 'Google Workspace', initials: 'AJ' };
                break;
            case 'MICROSOFT': // Active Directory
                mockUser = { ...MOCK_IDENTITIES.users[2], provider: 'Azure AD', initials: 'CC' }; // CFO
                break;
            case 'SAML': // Generic SAML
                mockUser = { ...MOCK_IDENTITIES.users[4], provider: 'Okta (SAML)', initials: 'DD' }; // Developer
                break;
            default:
                mockUser = { ...MOCK_IDENTITIES.users[1], provider: 'Guest', initials: 'BS' };
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
