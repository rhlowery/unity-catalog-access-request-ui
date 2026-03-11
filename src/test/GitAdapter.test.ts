import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitAdapter } from '../services/storage/adapters/GitAdapter';

describe('GitAdapter', () => {
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
            }
        });

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    const mockConfig = {
        gitRepo: 'test/repo',
        gitBranch: 'main'
    };

    it('load: returns empty if no state', async () => {
        const res = await GitAdapter.load(mockConfig);
        expect(res).toEqual([]);
    });

    it('load: returns merged and branched requests', async () => {
        const state = {
            merged: [{ id: '1', status: 'APPROVED' }],
            branches: {
                'req_2': { request: { id: '2', status: 'PENDING' } }
            }
        };
        mockStorage['acs_git_state_v1'] = JSON.stringify(state);

        const res = await GitAdapter.load(mockConfig);
        expect(res.length).toBe(2);
        expect(res.find(r => r.id === '1')).toBeDefined();
        expect(res.find(r => r.id === '2')).toBeDefined();
    });

    it('save: returns true and warns', async () => {
        const res = await GitAdapter.save([], mockConfig);
        expect(res).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });

    it('upsertRequest: creates new branch for PENDING', async () => {
        const request = {
            id: 'req123',
            status: 'PENDING',
            requiredApprovers: ['approver1'],
            requester: { name: 'Alice' },
            requestedObjects: []
        };

        await GitAdapter.upsertRequest(request, mockConfig);

        const state = JSON.parse(mockStorage['acs_git_state_v1']);
        expect(state.branches['req_req123']).toBeDefined();
        expect(state.branches['req_req123'].request.gitMetadata).toBeDefined();
        expect(state.branches['req_req123'].request.gitMetadata.mrLink).toContain('github.com/test/repo/pull/');
    });

    it('upsertRequest: uses GitLab link if configured', async () => {
        const request = {
            id: 'req123',
            status: 'PENDING',
            requiredApprovers: ['approver1'],
            requestedObjects: []
        };
        const gitlabConfig = { ...mockConfig, gitProvider: 'GITLAB' };

        await GitAdapter.upsertRequest(request, gitlabConfig);

        const state = JSON.parse(mockStorage['acs_git_state_v1']);
        expect(state.branches['req_req123'].request.gitMetadata.mrLink).toContain('/-/merge_requests/');
    });

    it('upsertRequest: merges if APPROVED and branch exists', async () => {
        const initialRequest = { id: 'req1', status: 'PENDING', gitMetadata: { branch: 'req_req1' } };
        mockStorage['acs_git_state_v1'] = JSON.stringify({
            merged: [],
            branches: {
                'req_req1': { request: initialRequest }
            }
        });

        const approvedRequest = { ...initialRequest, status: 'APPROVED' };
        await GitAdapter.upsertRequest(approvedRequest, mockConfig);

        const state = JSON.parse(mockStorage['acs_git_state_v1']);
        expect(state.merged.length).toBe(1);
        expect(state.merged[0].id).toBe('req1');
        expect(state.branches['req_req1']).toBeUndefined();
    });

    it('upsertRequest: closes if DENIED and branch exists', async () => {
        const initialRequest = { id: 'req1', status: 'PENDING' };
        mockStorage['acs_git_state_v1'] = JSON.stringify({
            merged: [],
            branches: {
                'req_req1': { request: initialRequest }
            }
        });

        const deniedRequest = { ...initialRequest, status: 'DENIED' };
        await GitAdapter.upsertRequest(deniedRequest, mockConfig);

        const state = JSON.parse(mockStorage['acs_git_state_v1']);
        expect(state.merged.length).toBe(1);
        expect(state.merged[0].status).toBe('DENIED');
        expect(state.branches['req_req1']).toBeUndefined();
    });

    it('upsertRequest: updates merged list if already merged', async () => {
        mockStorage['acs_git_state_v1'] = JSON.stringify({
            merged: [{ id: 'req1', status: 'APPROVED' }],
            branches: {}
        });

        const updatedRequest = { id: 'req1', status: 'REVOKED' };
        await GitAdapter.upsertRequest(updatedRequest, mockConfig);

        const state = JSON.parse(mockStorage['acs_git_state_v1']);
        expect(state.merged[0].status).toBe('REVOKED');
    });

    it('getGrants: returns grants for APPROVED requests', async () => {
        const state = {
            merged: [{
                id: 'req1',
                status: 'APPROVED',
                requestedObjects: [{ id: 'obj1' }],
                principals: [{ name: 'u1' }],
                permissions: ['SELECT']
            }],
            branches: {}
        };
        mockStorage['acs_git_state_v1'] = JSON.stringify(state);

        const res = await GitAdapter.getGrants({ id: 'obj1' }, mockConfig);
        expect(res.length).toBe(1);
        expect(res[0].requestId).toBe('req1');
    });

    it('getApprovers/saveApprovers: simulated empty/true', async () => {
        expect(await GitAdapter.getApprovers(mockConfig)).toEqual({});
        expect(await GitAdapter.saveApprovers({}, mockConfig)).toBe(true);
    });
});
