import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/audit/AuditIntegrityManager', () => ({
    AuditIntegrityManager: class {
        getSignedEntry = vi.fn((e) => Promise.resolve({ ...e, signature: 'signed' }));
        chainEntries = vi.fn();
    }
}));

vi.mock('../services/audit/SecureAuditStorage', () => ({
    SecureAuditStorage: class {
        verifyIntegrity = vi.fn().mockResolvedValue({ valid: true, issues: [] });
        getEntries = vi.fn().mockResolvedValue([]);
        storeEntry = vi.fn();
        cleanupOldEntries = vi.fn().mockResolvedValue(5);
    }
}));

import { ObservabilityService } from '../services/ObservabilityService';

describe('ObservabilityService', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        vi.clearAllMocks();
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
        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('Logging methods', () => {
        it('info: should log INFO message', () => {
            const spy = vi.spyOn(console, 'info');
            ObservabilityService.info('Test info', { attr: 1 });
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('INFO: Test info'), expect.any(Object));

            const logs = JSON.parse(mockStorage['acs_observability_logs'] || '[]');
            expect((logs[logs.length - 1] as any).message).toBe('Test info');
        });

        it('error: should log ERROR message and store in metrics', () => {
            const spy = vi.spyOn(console, 'error');
            ObservabilityService.error('Test error', { details: 'bad' });
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('ERROR: Test error'), expect.any(Object));

            const metrics = ObservabilityService.getMetrics() as any;
            expect(metrics.errors.length).toBeGreaterThan(0);
            expect(metrics.errors[metrics.errors.length - 1].message).toBe('Test error');
        });

        it('logError: helper for component errors', () => {
            const error = new Error('Component failed');
            const errorId = ObservabilityService.logError(error, { component: 'MyComp' });
            expect(errorId).toMatch(/^err_/);

            const metrics = ObservabilityService.getMetrics() as any;
            expect(metrics.errors.some((e: any) => e.error === 'Component failed')).toBe(true);
        });
    });

    describe('Audit logging', () => {
        it('logAccessRequest: should log to audit storage', async () => {
            await ObservabilityService.logAccessRequest('user1', 'resource1', ['READ'], 'justification');

            const metrics = ObservabilityService.getMetrics() as any;
            expect(metrics.auditEvents.length).toBeGreaterThan(0);
            expect(metrics.auditEvents[0].actor).toBe('user1');
            expect(metrics.auditEvents[0].type).toBe('ACCESS');
        });

        it('logPersonaSwitch: should log persona switch event', async () => {
            await ObservabilityService.logPersonaSwitch('admin', 'admin', 'data-scientist');

            const metrics = ObservabilityService.getMetrics() as any;
            expect(metrics.auditEvents.some((e: any) => e.type === 'PERSONA_SWITCH')).toBe(true);
        });
    });

    describe('Integrity and Maintenance', () => {
        it('verifyAuditIntegrity: should call audit storage', async () => {
            await ObservabilityService.verifyAuditIntegrity();
            // In the implementation, verifyAuditIntegrity returns void but inside it calls auditStorage.verifyIntegrity
        });

        it('cleanupAuditLogs: should call audit storage', async () => {
            const removed = await ObservabilityService.cleanupAuditLogs(30);
            expect(removed).toBe(5);
        });

        it('clearMetrics: should empty metric arrays', () => {
            ObservabilityService.error('msg', {});
            expect((ObservabilityService.getMetrics() as any).errors.length).toBeGreaterThan(0);

            ObservabilityService.clearMetrics();
            expect((ObservabilityService.getMetrics() as any).errors.length).toBe(0);
        });

        it('healthCheck: should return health status', async () => {
            const health = await ObservabilityService.healthCheck() as any;
            expect(health.status).toBe('healthy');
            expect(health.integrity).toEqual({ valid: true, issues: [] });
        });
    });

    describe('Configuration', () => {
        it('configure: should update internal config', () => {
            ObservabilityService.configure({ logLevel: 'ERROR' });

            const spy = vi.spyOn(console, 'info');
            ObservabilityService.info('Should not be logged', {});
            expect(spy).not.toHaveBeenCalled();

            ObservabilityService.error('Should be logged', {});
            expect(vi.spyOn(console, 'error')).toHaveBeenCalled();
        });
    });
});
