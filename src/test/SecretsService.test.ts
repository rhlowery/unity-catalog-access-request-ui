import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecretsService } from '../services/secrets/SecretsService';
import { ConfigService } from '../services/config/ConfigService';
import { EnvAdapter } from '../services/secrets/adapters/EnvAdapter';
import { VaultAdapter } from '../services/secrets/adapters/VaultAdapter';

vi.mock('../services/config/ConfigService');
vi.mock('../services/secrets/adapters/EnvAdapter');
vi.mock('../services/secrets/adapters/VaultAdapter');

describe('SecretsService', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        // Default mocks
        vi.mocked(ConfigService.getConfig).mockReturnValue({
            globalSecretProvider: 'PLAIN'
        });

        vi.mocked(EnvAdapter.getSecret).mockResolvedValue('env-secret');
        vi.mocked(VaultAdapter.getSecret).mockResolvedValue('vault-secret');

        // Explicitly mock the adapter module objects for testing
        vi.mocked(EnvAdapter.name) // just to access it, not really needed if we cast
    });

    describe('getAdapter', () => {
        it('should return EnvAdapter by default or when PLAIN is configured', () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({});
            expect(SecretsService.getAdapter()).toBe(EnvAdapter);

            vi.mocked(ConfigService.getConfig).mockReturnValue({ globalSecretProvider: 'PLAIN' });
            expect(SecretsService.getAdapter()).toBe(EnvAdapter);
        });

        it('should return VaultAdapter when VAULT is configured', () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ globalSecretProvider: 'VAULT' });
            expect(SecretsService.getAdapter()).toBe(VaultAdapter);
        });
    });

    describe('resolveSecret', () => {
        it('should return fallback value if source is PLAIN', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ globalSecretProvider: 'PLAIN' });

            const result = await SecretsService.resolveSecret('some/path', 'someKey', 'fallback');
            expect(result).toBe('fallback');
            expect(EnvAdapter.getSecret).not.toHaveBeenCalled();
        });

        it('should return fallback value if key is falsy', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ globalSecretProvider: 'VAULT' });

            const result = await SecretsService.resolveSecret('some/path', '', 'fallback');
            expect(result).toBe('fallback');
            expect(VaultAdapter.getSecret).not.toHaveBeenCalled();
        });

        it('should call the adapter to get secret if VAULT is configured and key exists', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ globalSecretProvider: 'VAULT' });

            const result = await SecretsService.resolveSecret('some/path', 'realKey', 'fallback');
            expect(result).toBe('vault-secret');
            expect(VaultAdapter.getSecret).toHaveBeenCalledWith('some/path', 'realKey', expect.any(Object));
        });
    });

    describe('resolveConfig', () => {
        it('should resolve _useVault properties in config', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ globalSecretProvider: 'VAULT' });

            const baseConfig = {
                vaultSecretPath: 'secret/my-app',
                databasePassword: 'fallback-password',
                databasePassword_useVault: true,
                databasePassword_vaultKey: 'db-pass',
                normalProp: 'normal-value'
            };

            const resolved = await SecretsService.resolveConfig(baseConfig);

            expect(resolved.normalProp).toBe('normal-value');
            expect(resolved.databasePassword).toBe('vault-secret');
            expect(VaultAdapter.getSecret).toHaveBeenCalledWith('secret/my-app', 'db-pass', expect.any(Object));
        });

        it('should ignore _useVault if set to false or key is missing', async () => {
            vi.mocked(ConfigService.getConfig).mockReturnValue({ globalSecretProvider: 'VAULT' });

            const baseConfig = {
                vaultSecretPath: 'secret/my-app',
                prop1: 'fallback-1',
                prop1_useVault: false,
                prop1_vaultKey: 'key-1',
                prop2: 'fallback-2',
                prop2_useVault: true // missing vaultKey
            };

            const resolved = await SecretsService.resolveConfig(baseConfig);

            expect(resolved.prop1).toBe('fallback-1');
            expect(resolved.prop2).toBe('fallback-2');
            expect(VaultAdapter.getSecret).not.toHaveBeenCalled();
        });
    });
});
