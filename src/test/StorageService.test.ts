import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService, getAdapter } from '../services/storage/StorageService';
import { ConfigService } from '../services/config/ConfigService';
import { BFFStorageAdapter } from '../services/storage/adapters/BFFStorageAdapter';
import { LocalStorageAdapter } from '../services/storage/adapters/LocalStorageAdapter';
import { GitAdapter } from '../services/storage/adapters/GitAdapter';

vi.mock('../services/config/ConfigService', () => ({
    ConfigService: {
        getResolvedConfig: vi.fn()
    }
}));

// Mock adapters
vi.mock('../services/storage/adapters/BFFStorageAdapter', () => ({
    BFFStorageAdapter: {
        load: vi.fn(),
        save: vi.fn(),
        upsertRequest: vi.fn(),
        getGrants: vi.fn(),
        getApprovers: vi.fn(),
        saveApprovers: vi.fn()
    }
}));

vi.mock('../services/storage/adapters/LocalStorageAdapter', () => ({
    LocalStorageAdapter: {
        load: vi.fn(),
        upsertRequest: vi.fn()
    }
}));

vi.mock('../services/storage/adapters/GitAdapter', () => ({
    GitAdapter: {
        load: vi.fn()
    }
}));

describe('StorageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAdapter', () => {
        it('should return BFFStorageAdapter by default', () => {
            expect(getAdapter({})).toBe(BFFStorageAdapter);
            expect(getAdapter(null)).toBe(BFFStorageAdapter);
        });

        it('should return correct adapters based on type', () => {
            expect(getAdapter({ storageType: 'LOCAL' })).toBe(LocalStorageAdapter);
            expect(getAdapter({ type: 'GIT' })).toBe(GitAdapter);
        });

        it('should warn when LOCAL storage is used', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            getAdapter({ type: 'LOCAL' });
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('[Security] Using LOCAL storage'));
        });
    });

    describe('Service methods', () => {
        const mockRequests = [{ id: '1', status: 'PENDING' }];
        const mockConfig = { storageType: 'BFF' };

        beforeEach(() => {
            vi.mocked(ConfigService.getResolvedConfig).mockResolvedValue(mockConfig);
        });

        it('loadRequests: delegates to adapter', async () => {
            vi.mocked(BFFStorageAdapter.load).mockResolvedValue(mockRequests as any);
            const requests = await StorageService.loadRequests();
            expect(requests).toEqual(mockRequests);
            expect(BFFStorageAdapter.load).toHaveBeenCalledWith(mockConfig);
        });

        it('saveRequests: delegates to adapter', async () => {
            vi.mocked(BFFStorageAdapter.save).mockResolvedValue(true);
            const result = await StorageService.saveRequests(mockRequests as any);
            expect(result).toBe(true);
            expect(BFFStorageAdapter.save).toHaveBeenCalledWith(mockRequests, mockConfig);
        });

        it('createRequest: sanitizes and delegates', async () => {
            const request = {
                objects: [{ name: 'obj1', id: 'id1', type: 'TABLE', extra: 'to-be-removed' }]
            };
            vi.mocked(BFFStorageAdapter.upsertRequest).mockResolvedValue(true);

            const result = await StorageService.createRequest(request as any);

            expect(result).toBe(true);
            expect(BFFStorageAdapter.upsertRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'PENDING',
                    objects: [{ id: 'id1', name: 'obj1', type: 'TABLE', fullPath: 'obj1' }]
                }),
                mockConfig
            );
        });

        it('getRequest: finds request by ID', async () => {
            vi.mocked(BFFStorageAdapter.load).mockResolvedValue(mockRequests as any);
            const request = await StorageService.getRequest('1');
            expect(request).toEqual(mockRequests[0]);

            const none = await StorageService.getRequest('99');
            expect(none).toBeUndefined();
        });

        it('updateRequest: finds, merges and upserts', async () => {
            vi.mocked(BFFStorageAdapter.load).mockResolvedValue(mockRequests as any);
            vi.mocked(BFFStorageAdapter.upsertRequest).mockResolvedValue(true);

            const result = await StorageService.updateRequest('1', { status: 'APPROVED' });

            expect(result).toBe(true);
            expect(BFFStorageAdapter.upsertRequest).toHaveBeenCalledWith(
                expect.objectContaining({ id: '1', status: 'APPROVED' }),
                mockConfig
            );
        });

        it('updateRequest: returns false if not found', async () => {
            vi.mocked(BFFStorageAdapter.load).mockResolvedValue(mockRequests as any);
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const result = await StorageService.updateRequest('99', { status: 'APPROVED' });
            expect(result).toBe(false);
            expect(spy).toHaveBeenCalled();
        });

        it('deleteRequest: filters and saves', async () => {
            vi.mocked(BFFStorageAdapter.load).mockResolvedValue(mockRequests as any);
            vi.mocked(BFFStorageAdapter.save).mockResolvedValue(true);

            const result = await StorageService.deleteRequest('1');

            expect(result).toBe(true);
            expect(BFFStorageAdapter.save).toHaveBeenCalledWith([], mockConfig);
        });

        it('getGrants/getApprovers/saveApprovers: delegate to adapter', async () => {
            vi.mocked(BFFStorageAdapter.getGrants).mockResolvedValue([]);
            vi.mocked(BFFStorageAdapter.getApprovers).mockResolvedValue({});
            vi.mocked(BFFStorageAdapter.saveApprovers).mockResolvedValue(true);

            await StorageService.getGrants({ name: 'obj' });
            expect(BFFStorageAdapter.getGrants).toHaveBeenCalled();

            await StorageService.getApprovers();
            expect(BFFStorageAdapter.getApprovers).toHaveBeenCalled();

            await StorageService.saveApprovers({});
            expect(BFFStorageAdapter.saveApprovers).toHaveBeenCalled();
        });
    });
});
