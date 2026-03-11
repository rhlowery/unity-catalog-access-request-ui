import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionManagerService } from '../services/session/SessionManager';
import { SecureSessionStorage } from '../services/session/SecureSessionStorage';

// Mock dependencies
vi.mock('../services/session/SecureSessionStorage');

// Mock fetch for getClientIP and BFF validation
global.fetch = vi.fn();

describe('SessionManagerService', () => {
    let service: SessionManagerService;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.resetAllMocks();

        // Mock default behaviors
        vi.mocked(SecureSessionStorage.prototype.validateSession).mockResolvedValue(true);
        vi.mocked(SecureSessionStorage.prototype.createSession).mockResolvedValue(undefined);
        vi.mocked(SecureSessionStorage.prototype.updateSession).mockResolvedValue(undefined);
        vi.mocked(SecureSessionStorage.prototype.deleteSession).mockResolvedValue(undefined);

        // Return dummy session
        const dummySession = {
            id: 'mock-session-id',
            userId: 'test-user',
            userName: 'Test User',
            userGroups: [],
            provider: 'test',
            createdAt: Date.now(),
            expiresAt: Date.now() + 100000,
            lastActivity: Date.now(),
            accessToken: 'mock-access',
            isActive: true
        };

        vi.mocked(SecureSessionStorage.prototype.getActiveSessionsForUser).mockResolvedValue([dummySession as any]);
        vi.mocked(SecureSessionStorage.prototype.getCurrentSession).mockResolvedValue(dummySession as any);

        service = new SessionManagerService({
            enableAuditLogging: false // Reduce noise during tests
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('createSession', () => {
        it('should create and store a new session', async () => {
            const user = { id: 'usr-1', name: 'Alice', groups: ['admins'] };
            vi.mocked(fetch).mockResolvedValueOnce({ json: () => Promise.resolve({ ip: '192.168.1.1' }) } as any);

            const session = await service.createSession(user, 'MOCK', { accessToken: 'token123' });

            expect(session.userId).toBe('usr-1');
            expect(session.accessToken).toBe('token123');
            expect(session.provider).toBe('MOCK');
            expect(session.ipAddress).toBe('192.168.1.1');

            expect(SecureSessionStorage.prototype.createSession).toHaveBeenCalledWith(
                expect.objectContaining({ id: session.id, userId: 'usr-1' })
            );
        });

        it('should handle getClientIP fetch failures gracefully', async () => {
            const user = { id: 'usr-1', name: 'Alice' };
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

            const session = await service.createSession(user, 'MOCK', { accessToken: 'token123' });

            expect(session.ipAddress).toBeUndefined();
        });
    });

    describe('validateSession', () => {
        it('should return null if session is not found', async () => {
            vi.mocked(SecureSessionStorage.prototype.getActiveSessionsForUser).mockResolvedValue([]);

            const result = await service.validateSession('unknown-id');
            expect(result).toBeNull();
        });

        it('should return null and destroy if local validation fails', async () => {
            vi.mocked(SecureSessionStorage.prototype.validateSession).mockResolvedValue(false);

            const result = await service.validateSession('mock-session-id');

            expect(result).toBeNull();
            expect(SecureSessionStorage.prototype.deleteSession).toHaveBeenCalledWith('mock-session-id');
        });

        it('should return session and track activity if valid and BFF responds 200', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({ status: 200 } as any);

            const result = await service.validateSession('mock-session-id');

            expect(result).toBeTruthy();
            expect(result?.id).toBe('mock-session-id');
            expect(SecureSessionStorage.prototype.updateSession).toHaveBeenCalledWith(
                'mock-session-id',
                expect.objectContaining({ lastActivity: expect.any(Number) })
            );
        });

        it('should destroy session and return null if BFF returns 401', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({ status: 401 } as any);

            const result = await service.validateSession('mock-session-id');

            expect(result).toBeNull();
            expect(SecureSessionStorage.prototype.deleteSession).toHaveBeenCalledWith('mock-session-id');
        });
    });

    describe('destroySession', () => {
        it('should delete session from storage and clear trackers', async () => {
            await service.destroySession('mock-session-id');

            expect(SecureSessionStorage.prototype.deleteSession).toHaveBeenCalledWith('mock-session-id');
            // Hard to assert private properties, but we assert the storage is cleared
        });
    });

    describe('logoutAllSessionsForUser', () => {
        it('should find all sessions and destroy them', async () => {
            await service.logoutAllSessionsForUser('test-user');

            // Should destroy the one mock session
            expect(SecureSessionStorage.prototype.deleteSession).toHaveBeenCalledWith('mock-session-id');
        });
    });
});
