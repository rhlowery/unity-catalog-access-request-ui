import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RDBMSAdapter } from '../services/storage/adapters/RDBMSAdapter';

describe('RDBMSAdapter', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
    });

    const mockConfig = { rdbmsConn: 'postgres://user:pass@localhost:5432/db' };

    it('load: returns empty array', async () => {
        const res = await RDBMSAdapter.load(mockConfig);
        expect(res).toEqual([]);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Querying SELECT * FROM requests'));
    });

    it('save: returns true', async () => {
        const res = await RDBMSAdapter.save([], mockConfig);
        expect(res).toBe(true);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Saving 0 requests'));
    });

    it('upsertRequest: returns true', async () => {
        const res = await RDBMSAdapter.upsertRequest({ id: '1' } as any, mockConfig);
        expect(res).toBe(true);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Upserting request 1'));
    });

    it('getGrants: returns empty array', async () => {
        const res = await RDBMSAdapter.getGrants({ id: 'obj1' }, mockConfig);
        expect(res).toEqual([]);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Querying grants for obj1'));
    });

    it('getApprovers: returns empty object', async () => {
        const res = await RDBMSAdapter.getApprovers(mockConfig);
        expect(res).toEqual({});
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Querying approvers'));
    });

    it('saveApprovers: returns true', async () => {
        const res = await RDBMSAdapter.saveApprovers({}, mockConfig);
        expect(res).toBe(true);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Saving approvers'));
    });
});
