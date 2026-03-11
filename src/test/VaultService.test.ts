import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultService } from '../services/VaultService';
import { ConfigService } from '../services/config/ConfigService';

vi.mock('../services/config/ConfigService', () => ({
    ConfigService: {
        getConfig: vi.fn()
    }
}));

describe('VaultService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        console.error = vi.fn();
        console.warn = vi.fn();
        console.log = vi.fn();
        global.fetch = vi.fn() as any;
    });

    it('should return null if config is missing', async () => {
        vi.mocked(ConfigService.getConfig).mockReturnValue({} as any);
        const result = await VaultService.fetchSecret('path', 'key');
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith("[VaultService] Missing Vault URL or Token configuration.");
    });

    it('should fetch KV v1 secret', async () => {
        vi.mocked(ConfigService.getConfig).mockReturnValue({ vaultUrl: 'http://vault', vaultToken: 'token' } as any);
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ data: { key: 'secret_value' } })
        } as any);

        const result = await VaultService.fetchSecret('path', 'key');
        expect(result).toBe('secret_value');
    });

    it('should fetch KV v2 secret', async () => {
        vi.mocked(ConfigService.getConfig).mockReturnValue({ vaultUrl: 'http://vault', vaultToken: 'token', vaultNamespace: 'ns' } as any);
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ data: { data: { key: 'secret_value_v2' } } })
        } as any);

        const result = await VaultService.fetchSecret('path', 'key');
        expect(result).toBe('secret_value_v2');
    });

    it('should return null if key not found', async () => {
        vi.mocked(ConfigService.getConfig).mockReturnValue({ vaultUrl: 'http://vault', vaultToken: 'token' } as any);
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ data: { other: 'value' } })
        } as any);

        const result = await VaultService.fetchSecret('path', 'key');
        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith("[VaultService] Key 'key' not found in secret payload.");
    });

    it('should handle fetch errors', async () => {
        vi.mocked(ConfigService.getConfig).mockReturnValue({ vaultUrl: 'http://vault', vaultToken: 'token' } as any);
        vi.mocked(global.fetch).mockRejectedValue(new Error('Fetch failed'));

        const result = await VaultService.fetchSecret('path', 'key');
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalled();
    });

    it('should handle non-ok responses', async () => {
        vi.mocked(ConfigService.getConfig).mockReturnValue({ vaultUrl: 'http://vault', vaultToken: 'token' } as any);
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden'
        } as any);

        const result = await VaultService.fetchSecret('path', 'key');
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalled();
    });

    it('should handle abort errors', async () => {
        vi.mocked(ConfigService.getConfig).mockReturnValue({ vaultUrl: 'http://vault', vaultToken: 'token' } as any);
        const abortErr = new Error('AbortError');
        abortErr.name = 'AbortError';
        vi.mocked(global.fetch).mockRejectedValue(abortErr);

        const result = await VaultService.fetchSecret('path', 'key');
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith("[VaultService] Request timed out after 10 seconds");
    });
});
