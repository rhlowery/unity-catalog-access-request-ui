import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdentityService } from '../services/identity/IdentityService';
import { ConfigService } from '../services/config/ConfigService';
import { MockIdentityAdapter } from '../services/identity/adapters/MockIdentityAdapter';
import { DatabricksIdentityAdapter } from '../services/identity/adapters/DatabricksIdentityAdapter';

vi.mock('../services/config/ConfigService');
vi.mock('../services/identity/adapters/MockIdentityAdapter');
vi.mock('../services/identity/adapters/DatabricksIdentityAdapter');

describe('IdentityService', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(ConfigService.getConfig).mockReturnValue({
            identityType: 'MOCK'
        });

        vi.mocked(ConfigService.getResolvedConfig).mockResolvedValue({
            identityType: 'MOCK'
        });

        MockIdentityAdapter.fetchIdentities = vi.fn().mockResolvedValue({ users: [], groups: [], servicePrincipals: [] });
        MockIdentityAdapter.getCurrentUser = vi.fn().mockResolvedValue({ id: 'mock-user' });
        MockIdentityAdapter.login = vi.fn().mockResolvedValue({ id: 'mock-user' });
        MockIdentityAdapter.logout = vi.fn().mockResolvedValue(undefined);

        DatabricksIdentityAdapter.fetchIdentities = vi.fn().mockResolvedValue({ users: [], groups: [], servicePrincipals: [] });
        DatabricksIdentityAdapter.getCurrentUser = vi.fn().mockResolvedValue({ id: 'db-user' });
        DatabricksIdentityAdapter.login = vi.fn().mockResolvedValue({ id: 'db-user' });
    });

    describe('getAdapter', () => {
        it('should return MockIdentityAdapter by default', () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({});
            expect(IdentityService.getAdapter()).toBe(MockIdentityAdapter);
        });

        it('should return MockIdentityAdapter for unknown types', () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'UNKNOWN_TYPE' });
            expect(IdentityService.getAdapter()).toBe(MockIdentityAdapter);
        });

        it('should return DatabricksIdentityAdapter when configured', () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'DATABRICKS' });
            expect(IdentityService.getAdapter()).toBe(DatabricksIdentityAdapter);
        });

        it('should fallback to MockIdentityAdapter for OAuth providers', () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'GOOGLE' });
            expect(IdentityService.getAdapter()).toBe(MockIdentityAdapter);
        });
    });

    describe('fetchIdentities', () => {
        it('should delegate to the configured adapter', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'DATABRICKS' });

            await IdentityService.fetchIdentities();

            expect(DatabricksIdentityAdapter.fetchIdentities).toHaveBeenCalled();
            expect(MockIdentityAdapter.fetchIdentities).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentUser', () => {
        it('should delegate to the configured adapter', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'MOCK' });

            const user = await IdentityService.getCurrentUser();

            expect(user?.id).toBe('mock-user');
            expect(MockIdentityAdapter.getCurrentUser).toHaveBeenCalled();
            expect(DatabricksIdentityAdapter.getCurrentUser).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should delegate to the configured adapter', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'MOCK' });

            const user = await IdentityService.login('mock-provider');

            expect(user.id).toBe('mock-user');
            expect(MockIdentityAdapter.login).toHaveBeenCalledWith('mock-provider', expect.any(Object), undefined);
        });

        it('should throw an error if adapter does not support login', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'DATABRICKS' });
            // Temporarily remove login from Databricks adapter mock for this test
            const originalLogin = DatabricksIdentityAdapter.login;
            delete (DatabricksIdentityAdapter as any).login;

            await expect(IdentityService.login('provider')).rejects.toThrow('Login not supported');

            // Restore
            DatabricksIdentityAdapter.login = originalLogin;
        });
    });

    describe('logout', () => {
        it('should delegate to the configured adapter if supported', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'MOCK' });

            await IdentityService.logout();

            expect(MockIdentityAdapter.logout).toHaveBeenCalled();
        });

        it('should not throw if adapter does not support logout', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ identityType: 'DATABRICKS' });
            // Databricks adapter mock doesn't have logout

            await expect(IdentityService.logout()).resolves.not.toThrow();
        });
    });
});
