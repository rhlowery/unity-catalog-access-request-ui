import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockIdentityAdapter, selectMockUser, getCurrentMockUser } from '../services/identity/adapters/MockIdentityAdapter';
import { MOCK_USERS, MOCK_IDENTITIES } from '../services/mockData';

describe('MockIdentityAdapter', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        vi.restoreAllMocks();

        vi.stubGlobal('localStorage', {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, value: string) => {
                mockStorage[key] = value;
            },
            removeItem: (key: string) => {
                delete mockStorage[key];
            },
            clear: () => {
                mockStorage = {};
            }
        });

        vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    it('fetchIdentities: returns mock identities with delay', async () => {
        const res = await MockIdentityAdapter.fetchIdentities({});
        expect(res).toEqual({
            users: MOCK_IDENTITIES.users,
            groups: MOCK_IDENTITIES.groups,
            servicePrincipals: MOCK_IDENTITIES.servicePrincipals
        });
    });

    it('getCurrentUser: returns null if no user in storage', async () => {
        const res = await MockIdentityAdapter.getCurrentUser({});
        expect(res).toBeNull();
    });

    it('getCurrentUser: returns user from storage', async () => {
        const user = { id: 'u1', name: 'User 1' };
        mockStorage['mock_current_user'] = JSON.stringify(user);
        const res = await MockIdentityAdapter.getCurrentUser({});
        expect(res.id).toBe('u1');
    });

    it('login: with specific credentials ID', async () => {
        const user = MOCK_USERS[0];
        const res = await MockIdentityAdapter.login('MOCK', {}, { id: user.id });
        expect(res.id).toBe(user.id);
        expect(JSON.parse(mockStorage['mock_current_user']).id).toBe(user.id);
    });

    it('login: with MOCK provider returns selection object', async () => {
        const res = await MockIdentityAdapter.login('MOCK', {});
        expect(res.requiresUserSelection).toBe(true);
        expect(res.availableUsers).toEqual(MOCK_USERS);
    });

    it('login: with OAuth provider returns pseudo-user', async () => {
        const res = await MockIdentityAdapter.login('GOOGLE', {});
        expect(res.id).toBe('user_google');
        expect(res.provider).toBe('google');
    });

    it('logout: clears storage', async () => {
        mockStorage['mock_current_user'] = '{"id":"u1"}';
        await MockIdentityAdapter.logout({});
        expect(mockStorage['mock_current_user']).toBeUndefined();
    });

    it('selectMockUser: sets storage and returns user', async () => {
        const user = MOCK_USERS[0];
        const res = await selectMockUser(user.id);
        expect(res.id).toBe(user.id);
        expect(JSON.parse(mockStorage['mock_current_user']).id).toBe(user.id);
    });

    it('selectMockUser: throws if not found', async () => {
        await expect(selectMockUser('invalid')).rejects.toThrow('User invalid not found');
    });

    it('getCurrentMockUser: helper works', async () => {
        const user = { id: 'u1' };
        mockStorage['mock_current_user'] = JSON.stringify(user);
        expect(getCurrentMockUser().id).toBe('u1');
    });
});
