import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VolatileAdapter } from '../services/storage/adapters/VolatileAdapter';

describe('VolatileAdapter', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        await VolatileAdapter.save([]); // Clear memory store before each test
        await VolatileAdapter.saveApprovers({}, { identityType: 'MOCK' });
        await VolatileAdapter.saveApprovers({}, { identityType: 'DATABRICKS' });
    });

    const mockReqPattern = {
        id: 'req1',
        status: 'APPROVED',
        requestedObjects: [{ id: 'obj1' }],
        principals: [{ id: 'p1' }],
        permissions: ['READ']
    };

    it('load: starts empty', async () => {
        const res = await VolatileAdapter.load();
        expect(res).toEqual([]);
    });

    it('save: assigns to store in memory', async () => {
        await VolatileAdapter.save([mockReqPattern]);
        const res = await VolatileAdapter.load();
        expect(res[0].id).toBe('req1');
    });

    it('upsertRequest: inserts natively if missing', async () => {
        await VolatileAdapter.upsertRequest(mockReqPattern);
        const res = await VolatileAdapter.load();
        expect(res.length).toBe(1);
    });

    it('upsertRequest: updates specifically if found', async () => {
        await VolatileAdapter.save([mockReqPattern]);
        await VolatileAdapter.upsertRequest({ ...mockReqPattern, status: 'DENIED' });
        const res = await VolatileAdapter.load();
        expect(res[0].status).toBe('DENIED');
    });

    it('getGrants: fetches mapped objects linked to APPROVED', async () => {
        await VolatileAdapter.save([mockReqPattern]);
        const grants = await VolatileAdapter.getGrants({ id: 'obj1' }, {});
        expect(grants.length).toBe(1);
        expect(grants[0].principal.id).toBe('p1');
        expect(grants[0].permissions).toContain('READ');
    });

    it('getGrants: returns empty if no matching object', async () => {
        await VolatileAdapter.save([mockReqPattern]);
        const grants = await VolatileAdapter.getGrants({ id: 'obj_other' }, {});
        expect(grants.length).toBe(0);
    });

    it('getGrants: returns empty if not APPROVED', async () => {
        await VolatileAdapter.save([{ ...mockReqPattern, status: 'PENDING' }]);
        const grants = await VolatileAdapter.getGrants({ id: 'obj1' }, {});
        expect(grants.length).toBe(0);
    });

    it('saveApprovers & getApprovers: persists in memory map by identityType', async () => {
        const approversMock = { 't1': ['u1'] };
        const approversDbks = { 't2': ['g1'] };

        await VolatileAdapter.saveApprovers(approversMock, { identityType: 'MOCK' });
        await VolatileAdapter.saveApprovers(approversDbks, { identityType: 'DATABRICKS' });

        expect(await VolatileAdapter.getApprovers({ identityType: 'MOCK' })).toEqual(approversMock);
        expect(await VolatileAdapter.getApprovers({ identityType: 'DATABRICKS' })).toEqual(approversDbks);
    });
});
