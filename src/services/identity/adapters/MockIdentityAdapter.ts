import { IIdentityAdapter, IdentityUser } from '../IIdentityAdapter';
import { MOCK_IDENTITIES } from '../../mockData';

/**
 * Mock Identity Adapter
 * Returns data from mockData.js
 */
export const MockIdentityAdapter: IIdentityAdapter = {
    ...IIdentityAdapter,
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

    async getCurrentUser(_config: any): Promise<IdentityUser> {
        return {
            id: 'user_alice',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            type: 'USER',
            initials: 'AJ',
            provider: 'Mock Auth',
            groups: ['group_finance_admins', 'group_platform_admins']
        };
    },

    async login(provider: string, _config: any): Promise<IdentityUser> {
        // Simulate login delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return different user based on provider
        const users: Record<string, IdentityUser> = {
            'GOOGLE': {
                id: 'user_alice',
                name: 'Alice Johnson',
                email: 'alice@example.com',
                type: 'USER',
                initials: 'AJ',
                provider: 'Google',
                groups: ['group_finance_admins', 'group_platform_admins']
            },
            'MICROSOFT': {
                id: 'user_carol',
                name: 'Carol CFO',
                email: 'carol@example.com',
                type: 'USER',
                initials: 'CC',
                provider: 'Microsoft',
                groups: ['group_finance_admins']
            },
            'SAML': {
                id: 'user_bob',
                name: 'Bob DevOps',
                email: 'bob@example.com',
                type: 'USER',
                initials: 'BD',
                provider: 'SAML',
                groups: ['group_platform_admins']
            },
            'ADMIN': {
                id: 'user_admin',
                name: 'Security Admin',
                email: 'admin@example.com',
                type: 'USER',
                initials: 'SA',
                provider: 'Admin',
                groups: ['group_finance_admins', 'group_platform_admins', 'group_governance_team']
            }
        };

        return users[provider] || users['GOOGLE'];
    },

    async logout(): Promise<void> {
        // Simulate logout
        console.log('Logging out...');
    }
};
