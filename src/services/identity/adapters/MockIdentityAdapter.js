import { IIdentityAdapter } from '../IIdentityAdapter';
import { MOCK_IDENTITIES } from '../../mockData';

/**
 * Mock Identity Adapter
 * Returns data from mockData.js
 */
export const MockIdentityAdapter = {
    ...IIdentityAdapter,
    name: 'Mock Identity',
    type: 'MOCK',

    async fetchIdentities(config) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
            users: MOCK_IDENTITIES.users,
            groups: MOCK_IDENTITIES.groups,
            servicePrincipals: MOCK_IDENTITIES.servicePrincipals
        };
    },

    async getCurrentUser(config) {
        return {
            id: 'user_alice',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            type: 'USER',
            initials: 'AJ',
            provider: 'Mock Auth',
            groups: ['group_finance_admins', 'group_platform_admins'] // Giving admin rights for testing
        };
    }
};
