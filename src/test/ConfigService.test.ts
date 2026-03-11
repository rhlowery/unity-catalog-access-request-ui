import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService, sanitizeConfig } from '../services/config/ConfigService';
import { SecretsService } from '../services/secrets/SecretsService';

vi.mock('../services/secrets/SecretsService', () => ({
    SecretsService: {
        resolveConfig: vi.fn((config) => Promise.resolve(config))
    }
}));

describe('ConfigService', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
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
        vi.clearAllMocks();
    });

    describe('sanitizeConfig', () => {
        it('should hide sensitive keys', () => {
            const config = {
                username: 'admin',
                password: 'secret_password',
                apiToken: 'some_long_token',
                db_host: 'localhost'
            };
            const sanitized = sanitizeConfig(config);
            expect(sanitized.username).toBe('admin');
            expect(sanitized.password).toBe('********');
            expect(sanitized.apiToken).toBe('********');
            expect(sanitized.db_host).toBe('localhost');
        });

        it('should not mask keys containing path or source', () => {
            const config = {
                keySource: 'vault',
                configPath: '/etc/config'
            };
            const sanitized = sanitizeConfig(config);
            expect(sanitized.keySource).toBe('vault');
            expect(sanitized.configPath).toBe('/etc/config');
        });

        it('should return empty object for null config', () => {
            expect(sanitizeConfig(null)).toEqual({});
        });
    });

    describe('ConfigService operations', () => {
        it('loadConfig/saveConfig: should store and retrieve values', () => {
            ConfigService.saveConfig('myKey', 'myValue');
            expect(ConfigService.loadConfig('myKey')).toBe('myValue');
        });

        it('updateConfig/getConfig: should manage complex objects', () => {
            const myConfig = { type: 'LOCAL', version: 1 };
            ConfigService.updateConfig(myConfig);
            expect(ConfigService.getConfig()).toEqual(myConfig);
        });

        it('getConfig: should handle malformed JSON', () => {
            mockStorage['uc_config'] = 'invalid-json';
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const config = ConfigService.getConfig();
            expect(config).toEqual({});
            expect(spy).toHaveBeenCalled();
            expect(mockStorage['uc_config']).toBeUndefined();
        });

        it('getSanitizedConfig: should return sanitized version', () => {
            ConfigService.updateConfig({ password: '123' });
            const sanitized = ConfigService.getSanitizedConfig();
            expect(sanitized.password).toBe('********');
        });

        it('getResolvedConfig: should call SecretsService', async () => {
            const myConfig = { vaultPath: 'secret/data' };
            ConfigService.updateConfig(myConfig);
            const resolved = await ConfigService.getResolvedConfig();
            expect(SecretsService.resolveConfig).toHaveBeenCalledWith(myConfig);
            expect(resolved).toEqual(myConfig);
        });
    });
});
