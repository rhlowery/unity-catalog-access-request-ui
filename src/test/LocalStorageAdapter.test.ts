import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../services/storage/adapters/LocalStorageAdapter';

describe('LocalStorageAdapter', () => {
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
    });

    const mockConfig = { type: 'LOCAL' };

    it('load: returns empty if no data', async () => {
        const res = await LocalStorageAdapter.load(mockConfig);
        expect(res).toEqual([]);
    });

    it('load: returns parsed valid data', async () => {
        const data = [{ id: '1', catalogName: 'cat1' }];
        mockStorage['uc_access_requests_v1'] = JSON.stringify(data);
        const res = await LocalStorageAdapter.load(mockConfig);
        expect(res.length).toBe(1);
        expect(res[0].id).toBe('1');
    });

    it('load: returns empty and removes if invalid JSON', async () => {
        mockStorage['uc_access_requests_v1'] = 'bad-json';
        const res = await LocalStorageAdapter.load(mockConfig);
        expect(res).toEqual([]);
        expect(console.warn).toHaveBeenCalled();
        expect(mockStorage['uc_access_requests_v1']).toBeUndefined();
    });

    it('load: returns empty and removes if invalid arr', async () => {
        mockStorage['uc_access_requests_v1'] = JSON.stringify([{ not_an_id: '1' }]);
        const res = await LocalStorageAdapter.load(mockConfig);
        expect(res).toEqual([]);
        expect(console.warn).toHaveBeenCalled();
    });

    it('save: returns false on bad format', async () => {
        const res = await LocalStorageAdapter.save([{ something: 'else' }] as any, mockConfig);
        expect(res).toBe(false);
        expect(console.error).toHaveBeenCalled();
    });

    it('save: saves valid formatting', async () => {
        const res = await LocalStorageAdapter.save([{ id: '1', catalogName: 'c1' }] as any, mockConfig);
        expect(res).toBe(true);
        const stored = mockStorage['uc_access_requests_v1'];
        expect(stored).toContain('"id":"1"');
    });

    it('save: handles quota errors gracefully', async () => {
        vi.stubGlobal('localStorage', {
            ...window.localStorage,
            setItem: () => { throw new Error('Quota'); }
        });
        const res = await LocalStorageAdapter.save([{ id: '1', catalogName: 'c1' }] as any, mockConfig);
        expect(console.error).toHaveBeenCalled();
        expect(res).toBe(false);
    });

    it('upsertRequest: fails on invalid format', async () => {
        const res = await LocalStorageAdapter.upsertRequest({ invalid: 'req' } as any, mockConfig);
        expect(res).toBe(false);
        expect(console.error).toHaveBeenCalled();
    });

    it('upsertRequest: inserts new', async () => {
        await LocalStorageAdapter.upsertRequest({ id: '1', catalogName: 'c1' } as any, mockConfig);
        const stored = mockStorage['uc_access_requests_v1'];
        const data = JSON.parse(stored || '[]');
        expect(data.length).toBe(1);
        expect(data[0].id).toBe('1');
    });

    it('upsertRequest: updates existing', async () => {
        mockStorage['uc_access_requests_v1'] = JSON.stringify([{ id: '1', catalogName: 'old' }]);
        await LocalStorageAdapter.upsertRequest({ id: '1', catalogName: 'new' } as any, mockConfig);
        const data = JSON.parse(mockStorage['uc_access_requests_v1'] || '[]');
        expect(data[0].catalogName).toBe('new');
    });

    it('getGrants: returns empty if no grants', async () => {
        expect(await LocalStorageAdapter.getGrants({ id: 't1' } as any, mockConfig)).toEqual([]);
    });

    it('getGrants: returns parsed grants', async () => {
        mockStorage['uc_grants_t1'] = JSON.stringify([{ principal: 'u1' }]);
        const res = await LocalStorageAdapter.getGrants({ id: 't1' } as any, mockConfig);
        expect(res.length).toBe(1);
        expect(res[0].principal).toBe('u1');
    });

    it('getGrants: clears on error', async () => {
        mockStorage['uc_grants_t1'] = 'bad-json';
        const res = await LocalStorageAdapter.getGrants({ id: 't1' } as any, mockConfig);
        expect(res).toEqual([]);
        expect(mockStorage['uc_grants_t1']).toBeUndefined();
    });

    it('getApprovers/saveApprovers: handles mock flow', async () => {
        const cfg = { ...mockConfig, identityType: 'MOCK' };
        const approvers = { 'cat.sch.tab': ['user1'] };
        await LocalStorageAdapter.saveApprovers(approvers, cfg);
        const retrieved = await LocalStorageAdapter.getApprovers(cfg);
        expect(retrieved).toEqual(approvers);
    });

    it('getApprovers: empty on error', async () => {
        mockStorage['uc_object_approvers_v1'] = 'bad-json';
        const res = await LocalStorageAdapter.getApprovers(mockConfig);
        expect(res).toEqual({});
    });

    it('saveApprovers: error handling', async () => {
        vi.stubGlobal('localStorage', {
            ...window.localStorage,
            setItem: (key: string) => {
                if (key === 'uc_object_approvers_v1') throw new Error('Quota');
            }
        });
        const res = await LocalStorageAdapter.saveApprovers({}, mockConfig);
        expect(res).toBe(false);
        expect(console.error).toHaveBeenCalled();
    });
});
