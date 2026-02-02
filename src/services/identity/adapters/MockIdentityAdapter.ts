import { IIdentityAdapter, IdentityUser } from '../IIdentityAdapter';
import { MOCK_USERS, MOCK_IDENTITIES } from '../../mockData';

/**
 * Mock Identity Adapter
 * Provides user selection for different roles
 */
export const MockIdentityAdapter: IIdentityAdapter = {
    name: 'Mock Identity',
    type: 'MOCK',

    async fetchIdentities(_config: any) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            users: MOCK_IDENTITIES.users,
            groups: MOCK_IDENTITIES.groups,
            servicePrincipals: MOCK_IDENTITIES.servicePrincipals
        };
    },

    async getCurrentUser(_config: any) {
        // Return currently logged in user from localStorage or null
        const currentUserData = localStorage.getItem('mock_current_user');
        if (currentUserData) {
            return JSON.parse(currentUserData);
        }
        return null;
    },

    async login(provider: string, _config: any) {
        console.log(`[MockIdentity] Login with ${provider}`);
        
        // For MOCK provider, show user selection
        if (provider === 'MOCK') {
            console.log(`[MockIdentity] Available users:`, MOCK_USERS);
            return {
                id: 'user_selection',
                name: 'Select User',
                email: 'select@mock.local',
                type: 'USER',
                initials: 'US',
                provider: 'mock',
                groups: ['group_all_users'],
                requiresUserSelection: true,
                availableUsers: MOCK_USERS
            };
        }
        
        // For OAuth/SAML providers, return a mock user with provider info
        const mockUser = {
            id: `user_${provider.toLowerCase()}`,
            name: `${provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()} User`,
            email: `user@${provider.toLowerCase()}.example.com`,
            type: 'USER',
            initials: provider.substring(0, 2).toUpperCase(),
            provider: provider.toLowerCase(),
            groups: ['group_all_users', 'group_standard_users']
        };
        
        console.log(`[MockIdentity] Returning mock user for ${provider}:`, mockUser);
        return mockUser;
    },

    async logout(_config: any) {
        console.log('[MockIdentity] Logout (clearing user selection)');
        localStorage.removeItem('mock_current_user');
    }
};

/**
 * Helper function to select and authenticate a specific mock user
 */
export const selectMockUser = async (userId: string): Promise<IdentityUser> => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
        throw new Error(`User ${userId} not found in mock users`);
    }
    
    // Store the selected user
    localStorage.setItem('mock_current_user', JSON.stringify(user));
    
    console.log(`[MockIdentity] Selected user: ${user.name} (${user.role})`);
    return user;
};

/**
 * Get currently selected mock user
 */
export const getCurrentMockUser = (): IdentityUser | null => {
    const currentUserData = localStorage.getItem('mock_current_user');
    return currentUserData ? JSON.parse(currentUserData) : null;
};