import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getM2MToken,
    fetchUCIdentities,
    fetchWorkspaces,
    fetchCatalogs,
    fetchSchemas,
    fetchTables,
    searchCatalog,
    fetchMe,
    clearTokenCache
} from '../services/UCIdentityService';
import { ConfigService } from '../services/config/ConfigService';
import { SecretsService } from '../services/secrets/SecretsService';
import { apiClient } from '../lib/axios';

vi.mock('../services/config/ConfigService', () => ({
    ConfigService: {
        getResolvedConfig: vi.fn()
    }
}));

vi.mock('../services/secrets/SecretsService', () => ({
    SecretsService: {
        resolveSecret: vi.fn()
    }
}));

vi.mock('../lib/axios', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

describe('UCIdentityService', () => {
    const mockConfig = {
        ucHost: 'accounts.cloud.databricks.com',
        ucClientId: 'client-id',
        ucClientSecret: 'client-secret',
        ucCloudProvider: 'AWS',
        ucAuthType: 'ACCOUNT',
        ucAccountId: 'account-id'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        clearTokenCache();
        vi.mocked(ConfigService.getResolvedConfig).mockResolvedValue(mockConfig);
    });

    describe('getM2MToken', () => {
        it('should fetch and cache token via BFF', async () => {
            vi.mocked(apiClient.post).mockResolvedValue({ status: 200 } as any);

            const token = await getM2MToken(mockConfig);

            expect(token).toBe('COOKIE_BASED_TOKEN');
            expect(apiClient.post).toHaveBeenCalledWith('/api/token', {
                host: 'accounts.cloud.databricks.com',
                clientId: 'client-id',
                clientSecret: 'client-secret'
            });

            // Second call should return cached token
            const token2 = await getM2MToken(mockConfig);
            expect(token2).toBe('COOKIE_BASED_TOKEN');
            expect(apiClient.post).toHaveBeenCalledTimes(1);
        });

        it('should resolve secret from Vault if configured', async () => {
            const vaultConfig = {
                ...mockConfig,
                ucClientSecretSource: 'VAULTED',
                vaultSecretPath: 'secret/path',
                ucClientSecretVaultKey: 'key'
            };
            vi.mocked(SecretsService.resolveSecret).mockResolvedValue('vault-secret');
            vi.mocked(apiClient.post).mockResolvedValue({ status: 200 } as any);

            await getM2MToken(vaultConfig);

            expect(SecretsService.resolveSecret).toHaveBeenCalledWith('secret/path', 'key', 'client-secret');
            expect(apiClient.post).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
                clientSecret: 'vault-secret'
            }));
        });

        it('should handle errors gracefully', async () => {
            vi.mocked(apiClient.post).mockRejectedValue(new Error('Auth failed'));
            const token = await getM2MToken(mockConfig);
            expect(token).toBeNull();
        });
    });

    describe('fetchUCIdentities', () => {
        it('should fetch and normalize users, groups and SPs', async () => {
            vi.mocked(apiClient.post).mockResolvedValue({ status: 200 } as any);
            vi.mocked(apiClient.get).mockImplementation((url: string) => {
                if (url.includes('/Users')) return Promise.resolve({ data: { Resources: [{ id: 'u1', userName: 'user1' }] } });
                if (url.includes('/Groups')) return Promise.resolve({ data: { Resources: [{ id: 'g1', displayName: 'group1' }] } });
                if (url.includes('/ServicePrincipals')) return Promise.resolve({ data: { Resources: [{ id: 'sp1', displayName: 'sp1' }] } });
                return Promise.reject('Unknown');
            });

            const result = await fetchUCIdentities();

            expect(result).not.toBeNull();
            expect(result?.users[0].name).toBe('user1');
            expect(result?.groups[0].name).toBe('group1');
            expect(result?.servicePrincipals[0].name).toBe('sp1');
        });
    });

    describe('fetchWorkspaces', () => {
        it('should fetch workspaces in ACCOUNT mode', async () => {
            vi.mocked(apiClient.post).mockResolvedValue({ status: 200 } as any);
            vi.mocked(apiClient.get).mockResolvedValue({ data: [{ workspace_id: 'ws1', workspace_name: 'WS1', deployment_name: 'd1' }] });

            const result = await fetchWorkspaces();

            expect(result).toEqual([{ id: 'ws1', name: 'WS1', url: 'https://d1.cloud.databricks.com' }]);
        });
    });

    describe('fetchCatalogs/Schemas/Tables', () => {
        const workspaceUrl = 'https://host';

        it('fetchCatalogs: should return list of catalogs', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({ data: { catalogs: [{ name: 'cat1' }] } });
            const result = await fetchCatalogs(workspaceUrl);
            expect(result[0].name).toBe('cat1');
        });

        it('fetchSchemas: should return list of schemas', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({ data: { schemas: [{ name: 'sch1' }] } });
            const result = await fetchSchemas(workspaceUrl, 'cat1');
            expect(result.items[0].name).toBe('sch1');
        });

        it('fetchTables: should return list of tables', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({
                data: { tables: [{ name: 'tbl1', table_type: 'MANAGED', owner: 'me' }] }
            });
            const result = await fetchTables(workspaceUrl, 'cat1', 'sch1');
            expect(result.items[0].name).toBe('tbl1');
        });
    });

    describe('searchCatalog', () => {
        it('should call search API', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [{ name: 'match' }] } });
            const result = await searchCatalog('https://host', 'query');
            expect(result[0].name).toBe('match');
        });
    });

    describe('fetchMe', () => {
        it('should fetch and normalize current user profile', async () => {
            vi.mocked(apiClient.get).mockResolvedValue({
                data: { id: 'me-id', displayName: 'Me User', userName: 'me@example.com', groups: [{ display: 'admins' }] }
            });
            const result = await fetchMe();
            expect(result?.name).toBe('Me User');
            expect(result?.initials).toBe('MU');
            expect(result?.groups).toContain('admins');
        });
    });
});
