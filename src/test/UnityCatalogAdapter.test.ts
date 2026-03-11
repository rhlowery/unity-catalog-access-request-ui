import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnityCatalogAdapter } from '../services/storage/adapters/UnityCatalogAdapter';
import * as UCIdentityService from '../services/UCIdentityService';

vi.mock('../services/UCIdentityService', () => ({
    getM2MToken: vi.fn()
}));

describe('UnityCatalogAdapter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn() as any;
        console.warn = vi.fn();
        console.log = vi.fn();
        console.error = vi.fn();
    });

    const validConfig = {
        ucCatalog: 'cat',
        ucSchema: 'sch',
        ucTable: 'tab',
        ucWarehouseId: 'w123',
        ucHost: 'http://test'
    };

    it('load: returns empty if missing config', async () => {
        const res = await UnityCatalogAdapter.load({});
        expect(res).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith("[UC Adapter] Missing configuration for UC Storage.");
    });

    it('load: formats rows and parses JSON', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                manifest: { schema: { columns: [{ name: 'id' }, { name: 'objects' }] } },
                result: { data_array: [['1', '{"name":"obj1"}']] }
            })
        } as any);

        const res = await UnityCatalogAdapter.load(validConfig);
        expect(res[0].id).toBe('1');
        expect(res[0].objects.name).toBe('obj1');
    });

    it('load: handles errors', async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error('Load error'));
        const res = await UnityCatalogAdapter.load(validConfig);
        expect(res).toEqual([]);
        expect(console.error).toHaveBeenCalled();
    });

    it('save: makes fetch call to BFF', async () => {
        vi.mocked(global.fetch).mockResolvedValue({ ok: true } as any);
        const res = await UnityCatalogAdapter.save([{ id: 1 }], validConfig);
        expect(res).toBe(true);
        expect(global.fetch).toHaveBeenCalled();
    });

    it('save: handles fetch error', async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error('Save error'));
        const res = await UnityCatalogAdapter.save([{ id: 1 }], validConfig);
        expect(res).toBe(false);
    });

    it('upsertRequest: updates existing and saves', async () => {
        vi.spyOn(UnityCatalogAdapter, 'load').mockResolvedValue([{ id: '1', data: 'old' }]);
        vi.spyOn(UnityCatalogAdapter, 'save').mockResolvedValue(true);
        const res = await UnityCatalogAdapter.upsertRequest({ id: '1', data: 'new' }, validConfig);
        expect(UnityCatalogAdapter.save).toHaveBeenCalledWith([{ id: '1', data: 'new' }], validConfig);
        expect(res).toBe(true);
    });

    it('upsertRequest: inserts new and saves', async () => {
        vi.spyOn(UnityCatalogAdapter, 'load').mockResolvedValue([{ id: '1', data: 'old' }]);
        vi.spyOn(UnityCatalogAdapter, 'save').mockResolvedValue(true);
        const res = await UnityCatalogAdapter.upsertRequest({ id: '2', data: 'new' }, validConfig);
        expect(UnityCatalogAdapter.save).toHaveBeenCalledWith([{ id: '1', data: 'old' }, { id: '2', data: 'new' }], validConfig);
        expect(res).toBe(true);
    });

    it('getGrants: returns empty array', async () => {
        expect(await UnityCatalogAdapter.getGrants({}, validConfig)).toEqual([]);
    });

    it('getApprovers: fetches from BFF', async () => {
        vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({ app: 1 }) } as any);
        const res = await UnityCatalogAdapter.getApprovers(validConfig);
        expect(res.app).toBe(1);
    });

    it('saveApprovers: posts to BFF', async () => {
        vi.mocked(global.fetch).mockResolvedValue({ ok: true } as any);
        const res = await UnityCatalogAdapter.saveApprovers({ app: 1 }, validConfig);
        expect(res).toBe(true);
    });

    it('getLiveGrants: returns mock on token failure', async () => {
        vi.mocked(UCIdentityService.getM2MToken).mockResolvedValue('');
        const res = await UnityCatalogAdapter.getLiveGrants({ name: 'transactions', type: 'TABLE', id: 't1' }, validConfig);
        expect(res.length).toBe(1);
        expect(console.error).toHaveBeenCalled();
    });

    it('getLiveGrants: fetches live grants', async () => {
        vi.mocked(UCIdentityService.getM2MToken).mockResolvedValue('token');
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                privilege_assignments: [
                    { principal: 'u1', privileges: ['SELECT'] }
                ]
            })
        } as any);
        const res = await UnityCatalogAdapter.getLiveGrants({ name: 't1', type: 'TABLE', id: 't1' }, validConfig);
        expect(res[0].principal.name).toBe('u1');
        expect(res[0].permissions).toContain('SELECT');
    });

    it('getLiveGrants: returns mock on fetch Not-OK', async () => {
        vi.mocked(UCIdentityService.getM2MToken).mockResolvedValue('token');
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            status: 404
        } as any);
        const res = await UnityCatalogAdapter.getLiveGrants({ name: 'transactions', type: 'TABLE', id: 't1' }, validConfig);
        expect(res.length).toBe(1);
        expect(console.warn).toHaveBeenCalled();
    });
});
