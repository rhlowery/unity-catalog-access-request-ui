import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureSessionStorage } from '../services/session/SecureSessionStorage';
import { WebCrypto } from '../services/crypto/WebCryptoService';
import { SessionInfo } from '../services/session/SessionTypes';

describe('SecureSessionStorage', () => {
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

        vi.spyOn(WebCrypto, 'encrypt').mockImplementation(async (data) => `enc_${data}`);
        vi.spyOn(WebCrypto, 'decrypt').mockImplementation(async (data) => data.replace('enc_', ''));
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    const mockSession: SessionInfo = {
        id: 's1',
        userId: 'u1',
        userName: 'User 1',
        principalName: 'u1@example.com',
        provider: 'MOCK',
        expiresAt: Date.now() + 3600000,
        lastActivity: Date.now(),
        isActive: true,
        metadata: {}
    };

    it('createSession: encrypts and stores session', async () => {
        const storage = new SecureSessionStorage();
        await storage.createSession(mockSession);

        expect(mockStorage['acs_current_session']).toBeDefined();
        expect(mockStorage['acs_current_session']).toContain('enc_');

        const sessions = JSON.parse((await WebCrypto.decrypt(mockStorage['acs_sessions'])));
        expect(sessions.length).toBe(1);
        expect(sessions[0].id).toBe('s1');
    });

    it('getCurrentSession: decrypts and returns session', async () => {
        const storage = new SecureSessionStorage();
        await storage.createSession(mockSession);

        const current = await storage.getCurrentSession();
        expect(current?.id).toBe('s1');
    });

    it('getCurrentSession: returns null if session expired', async () => {
        const storage = new SecureSessionStorage();
        const expired = { ...mockSession, expiresAt: Date.now() - 1000 };
        await storage.createSession(expired);

        const current = await storage.getCurrentSession();
        expect(current).toBeNull();
    });

    it('updateSession: updates session in list and current', async () => {
        const storage = new SecureSessionStorage();
        await storage.createSession(mockSession);

        await storage.updateSession('s1', { userName: 'Updated Name' });

        const current = await storage.getCurrentSession();
        expect(current?.userName).toBe('Updated Name');
    });

    it('deleteSession: removes session', async () => {
        const storage = new SecureSessionStorage();
        await storage.createSession(mockSession);

        await storage.deleteSession('s1');
        expect(await storage.getCurrentSession()).toBeNull();

        const sessionsList = await (storage as any).getAllSessions();
        expect(sessionsList.length).toBe(0);
    });

    it('getActiveSessionsForUser: filters correctly', async () => {
        const storage = new SecureSessionStorage();
        await storage.createSession(mockSession);
        await storage.createSession({ ...mockSession, id: 's2', userId: 'u2' });

        const user1Sessions = await storage.getActiveSessionsForUser('u1');
        expect(user1Sessions.length).toBe(1);
        expect(user1Sessions[0].id).toBe('s1');
    });

    it('cleanupExpiredSessions: removes expired ones', async () => {
        const storage = new SecureSessionStorage();
        const expired = { ...mockSession, id: 'expired', expiresAt: Date.now() - 1000 };

        // Directly inject into list
        await (storage as any).saveAllSessions([mockSession, expired]);

        await storage.cleanupExpiredSessions();
        const active = await (storage as any).getAllSessions();
        expect(active.length).toBe(1);
        expect(active[0].id).toBe('s1');
    });

    it('validateSession: checks by id', async () => {
        const storage = new SecureSessionStorage();
        await storage.createSession(mockSession);

        expect(await storage.validateSession('s1')).toBe(true);
        expect(await storage.validateSession('non-existent')).toBe(false);
    });

    it('handles decryption failure in getAllSessions', async () => {
        const storage = new SecureSessionStorage();
        mockStorage['acs_sessions'] = 'invalid-encrypted-data';
        vi.mocked(WebCrypto.decrypt).mockRejectedValueOnce(new Error('Decryption failed'));

        const sessions = await (storage as any).getAllSessions();
        expect(sessions).toEqual([]);
        expect(mockStorage['acs_sessions']).toBeUndefined();
    });
});
