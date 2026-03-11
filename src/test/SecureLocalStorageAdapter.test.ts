import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureLocalStorageAdapter } from '../services/storage/adapters/SecureLocalStorageAdapter';
import { WebCrypto } from '../services/crypto/WebCryptoService';

describe('SecureLocalStorageAdapter', () => {
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
            },
            length: 0,
            key: (index: number) => null
        });

        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // Mock WebCrypto
        vi.spyOn(WebCrypto, 'encrypt').mockImplementation(async (data: string) => `enc:${data}`);
        vi.spyOn(WebCrypto, 'decrypt').mockImplementation(async (data: string) => data.startsWith('enc:') ? data.slice(4) : data);
    });

    const mockConfig = { type: 'SECURE_LOCAL' };

    it('load: returns empty if no data', async () => {
        const res = await SecureLocalStorageAdapter.load(mockConfig);
        expect(res).toEqual([]);
    });

    it('load: returns decrypted valid data', async () => {
        const data = [{ id: '1', catalogName: 'cat1' }];
        mockStorage['uc_access_requests_secure_v1'] = `enc:${JSON.stringify(data)}`;
        const res = await SecureLocalStorageAdapter.load(mockConfig);
        expect(res.length).toBe(1);
        expect(res[0].id).toBe('1');
    });

    it('save: encrypts and saves valid data', async () => {
        const data = [{ id: '1', catalogName: 'c1' }];
        const res = await SecureLocalStorageAdapter.save(data as any, mockConfig);
        expect(res).toBe(true);
        const stored = mockStorage['uc_access_requests_secure_v1'];
        expect(stored).toBe(`enc:${JSON.stringify(data)}`);
    });

    it('upsertRequest: inserts new encrypted entry', async () => {
        await SecureLocalStorageAdapter.upsertRequest({ id: '1', catalogName: 'c1' } as any, mockConfig);
        const stored = mockStorage['uc_access_requests_secure_v1'];
        expect(stored).toBeDefined();
        expect(stored?.startsWith('enc:')).toBe(true);

        const decrypted = await WebCrypto.decrypt(stored!);
        const data = JSON.parse(decrypted);
        expect(data.length).toBe(1);
        expect(data[0].id).toBe('1');
    });

    it('getApprovers/saveApprovers: handles encrypted flow', async () => {
        const cfg = { ...mockConfig, identityType: 'MOCK' };
        const approvers = { 'cat.sch.tab': ['user1'] };
        await SecureLocalStorageAdapter.saveApprovers(approvers, cfg);

        const stored = mockStorage['uc_object_approvers_secure_v1'];
        expect(stored?.startsWith('enc:')).toBe(true);

        const retrieved = await SecureLocalStorageAdapter.getApprovers(cfg);
        expect(retrieved).toEqual(approvers);
    });
});
