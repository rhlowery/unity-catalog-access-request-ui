import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BFFStorageAdapter } from '../services/storage/adapters/BFFStorageAdapter';
import { apiClient } from '../lib/axios';

vi.mock('../lib/axios', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

describe('BFFStorageAdapter', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    const mockConfig = { identityType: 'MOCK' };

    it('load: returns data from apiClient', async () => {
        const mockData = [{ id: '1' }];
        vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

        const res = await BFFStorageAdapter.load(mockConfig);
        expect(res).toEqual(mockData);
        expect(apiClient.get).toHaveBeenCalledWith('/api/storage/requests');
    });

    it('load: handles error', async () => {
        vi.mocked(apiClient.get).mockRejectedValue(new Error('Fetch failed'));
        const res = await BFFStorageAdapter.load(mockConfig);
        expect(res).toEqual([]);
        expect(console.error).toHaveBeenCalled();
    });

    it('save: returns true for successful post', async () => {
        vi.mocked(apiClient.post).mockResolvedValue({ status: 200 });
        const res = await BFFStorageAdapter.save([{ id: '1' }] as any, mockConfig);
        expect(res).toBe(true);
        expect(apiClient.post).toHaveBeenCalledWith('/api/storage/requests', [{ id: '1' }]);
    });

    it('save: handles error', async () => {
        vi.mocked(apiClient.post).mockRejectedValue(new Error('Post failed'));
        const res = await BFFStorageAdapter.save([{ id: '1' }] as any, mockConfig);
        expect(res).toBe(false);
        expect(console.error).toHaveBeenCalled();
    });

    it('upsertRequest: inserts or updates correctly', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
        vi.mocked(apiClient.post).mockResolvedValue({ status: 200 });

        // Insert new
        await BFFStorageAdapter.upsertRequest({ id: '1', val: 'new' } as any, mockConfig);
        expect(apiClient.post).toHaveBeenCalledWith('/api/storage/requests', [{ id: '1', val: 'new' }]);

        // Update existing
        vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: '1', val: 'new' }] });
        await BFFStorageAdapter.upsertRequest({ id: '1', val: 'updated' } as any, mockConfig);
        expect(apiClient.post).toHaveBeenCalledWith('/api/storage/requests', [{ id: '1', val: 'updated' }]);
    });

    it('getGrants: returns matching grants', async () => {
        const mockRequests = [
            {
                id: '1',
                status: 'APPROVED',
                objects: [{ id: 'obj1' }],
                principal: 'u1',
                permissions: ['SELECT']
            },
            {
                id: '2',
                status: 'PENDING',
                objects: [{ id: 'obj1' }]
            }
        ];
        vi.mocked(apiClient.get).mockResolvedValue({ data: mockRequests });

        const res = await BFFStorageAdapter.getGrants({ id: 'obj1' }, mockConfig);
        expect(res.length).toBe(1);
        expect(res[0].id).toBe('grant-1');
    });

    it('getApprovers: returns scoped data', async () => {
        const mockData = { MOCK: { 'o1': ['a1'] }, DBKS: { 'o2': ['a2'] } };
        vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

        const res = await BFFStorageAdapter.getApprovers(mockConfig);
        expect(res).toEqual(mockData.MOCK);
    });

    it('getApprovers: handles 404', async () => {
        const error = { response: { status: 404 } };
        vi.mocked(apiClient.get).mockRejectedValue(error);
        const res = await BFFStorageAdapter.getApprovers(mockConfig);
        expect(res).toEqual({});
    });

    it('saveApprovers: merges and saves', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { DBKS: { x: 1 } } });
        vi.mocked(apiClient.post).mockResolvedValue({ status: 204 });

        const res = await BFFStorageAdapter.saveApprovers({ MOCK: 1 } as any, mockConfig);
        expect(res).toBe(true);
        expect(apiClient.post).toHaveBeenCalledWith('/api/storage/approvers', {
            DBKS: { x: 1 },
            MOCK: { MOCK: 1 }
        });
    });
});
