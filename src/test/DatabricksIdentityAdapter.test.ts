import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabricksIdentityAdapter } from '../services/identity/adapters/DatabricksIdentityAdapter';
import * as UCIdentityService from '../services/UCIdentityService';

vi.mock('../services/UCIdentityService', () => ({
    fetchUCIdentities: vi.fn(),
    fetchMe: vi.fn()
}));

describe('DatabricksIdentityAdapter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        console.warn = vi.fn();
        console.log = vi.fn();
    });

    it('should fetch identities from UC', async () => {
        vi.mocked(UCIdentityService.fetchUCIdentities).mockResolvedValue({ users: ['u1'], groups: ['g1'], servicePrincipals: [] });
        const result = await DatabricksIdentityAdapter.fetchIdentities({});
        expect(result.users).toEqual(['u1']);
    });

    it('should fallback to empty arrays if fetch fails', async () => {
        vi.mocked(UCIdentityService.fetchUCIdentities).mockResolvedValue(null);
        const result = await DatabricksIdentityAdapter.fetchIdentities({});
        expect(result.users).toEqual([]);
        expect(result.groups).toEqual([]);
    });

    it('should get current user from UC', async () => {
        vi.mocked(UCIdentityService.fetchMe).mockResolvedValue({ id: 'me' } as any);
        const result = await DatabricksIdentityAdapter.getCurrentUser({});
        expect(result.id).toBe('me');
    });

    it('should fallback generic user if fetchMe fails', async () => {
        vi.mocked(UCIdentityService.fetchMe).mockResolvedValue(null);
        const result = await DatabricksIdentityAdapter.getCurrentUser({});
        expect(result.id).toBe('unknown_user');
        expect(console.warn).toHaveBeenCalledWith("[DatabricksIdentity] Could not fetch real identity, using fallback.");
    });

    it('should require credentials if not provided in login', async () => {
        const result = await DatabricksIdentityAdapter.login?.('Databricks', {});
        expect(result.requiresCredentials).toBe(true);
    });

    it('should handle PAT login', async () => {
        vi.mocked(UCIdentityService.fetchMe).mockResolvedValue({ id: 'me' } as any);
        const result = await DatabricksIdentityAdapter.login?.('Databricks', { ucHost: 'databricks.com' }, { type: 'PAT', token: 'token' });
        expect(result.id).toBe('me');
        expect(console.log).toHaveBeenCalledWith("[DatabricksIdentity] Authenticating with PAT...");
    });

    it('should logout cleanly', async () => {
        await DatabricksIdentityAdapter.logout?.({});
        expect(console.log).toHaveBeenCalledWith("[DatabricksIdentity] Logout");
    });
});
