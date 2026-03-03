import { SessionInfo, SessionConfig, SessionStorage } from './SessionTypes';
import { WebCrypto } from '../crypto/WebCryptoService';

const SESSION_STORAGE_KEY = 'acs_sessions';
const CURRENT_SESSION_KEY = 'acs_current_session';

const DEFAULT_CONFIG: SessionConfig = {
  timeoutMinutes: 480, // 8 hours
  renewalThresholdMinutes: 60, // Renew when 1 hour left
  maxSessionsPerUser: 3,
  requireReauthForSensitiveOps: true,
  enableAuditLogging: true
};

export class SecureSessionStorage implements SessionStorage {
  private config: SessionConfig;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async encryptSession(session: SessionInfo): Promise<string> {
    const sessionData = JSON.stringify(session);
    return await WebCrypto.encrypt(sessionData);
  }

  private async decryptSession(encryptedSession: string): Promise<SessionInfo | null> {
    try {
      const decrypted = await WebCrypto.decrypt(encryptedSession);
      return JSON.parse(decrypted) as SessionInfo;
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to decrypt session:', error);
      return null;
    }
  }

  async getCurrentSession(): Promise<SessionInfo | null> {
    try {
      const encrypted = localStorage.getItem(CURRENT_SESSION_KEY);
      if (!encrypted) return null;

      const session = await this.decryptSession(encrypted);
      if (!session || !this.validateSessionData(session)) {
        await this.deleteSession(session ? session.id : '');
        return null;
      }

      return session;
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to get current session:', error);
      return null;
    }
  }

  async createSession(session: SessionInfo): Promise<void> {
    try {
      // Limit sessions per user
      const existingSessions = await this.getActiveSessionsForUser(session.userId);
      if (existingSessions.length >= this.config.maxSessionsPerUser) {
        const oldestSession = existingSessions[0];
        await this.deleteSession(oldestSession.id);
      }

      const encrypted = await this.encryptSession(session);
      localStorage.setItem(CURRENT_SESSION_KEY, encrypted);

      // Update sessions list (we still use JSON.stringify for the list as it's not the primary sensitive store, but we could encrypt each)
      const sessions = await this.getAllSessions();
      sessions.push(session);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

      console.log(`[SecureSessionStorage] Created session ${session.id} for user ${session.userId}`);
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to create session:', error);
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionInfo>): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);

      if (sessionIndex >= 0) {
        sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

        // Update current session if it's the one being modified
        const encrypted = localStorage.getItem(CURRENT_SESSION_KEY);
        if (encrypted) {
          const currentSession = await this.decryptSession(encrypted);
          if (currentSession?.id === sessionId) {
            const updatedSession = sessions[sessionIndex];
            const newEncrypted = await this.encryptSession(updatedSession);
            localStorage.setItem(CURRENT_SESSION_KEY, newEncrypted);
          }
        }
      }
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to update session:', error);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Remove from sessions list
      const sessions = (await this.getAllSessions()).filter(s => s.id !== sessionId);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

      // Remove current session if it matches (check directly to prevent infinite recursion loop)
      const encrypted = localStorage.getItem(CURRENT_SESSION_KEY);
      if (encrypted) {
        const currentSession = await this.decryptSession(encrypted);
        if (currentSession?.id === sessionId) {
          localStorage.removeItem(CURRENT_SESSION_KEY);
        }
      }

      console.log(`[SecureSessionStorage] Deleted session ${sessionId}`);
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to delete session:', error);
    }
  }

  async getActiveSessionsForUser(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await this.getAllSessions();
      return sessions
        .filter(s => s.userId === userId && s.isActive && this.validateSessionData(s))
        .sort((a, b) => a.lastActivity - b.lastActivity);
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to get sessions for user:', error);
      return [];
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const activeSessions = sessions.filter(s => this.validateSessionData(s));
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSessions));

      // Clean up current session if expired
      const encrypted = localStorage.getItem(CURRENT_SESSION_KEY);
      if (encrypted) {
        const currentSession = await this.decryptSession(encrypted);
        if (currentSession && !this.validateSessionData(currentSession)) {
          localStorage.removeItem(CURRENT_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to cleanup sessions:', error);
    }
  }

  private async getSessionById(sessionId: string): Promise<SessionInfo | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.getSessionById(sessionId);
    return this.validateSessionData(session);
  }

  private validateSessionData(session: SessionInfo | null): boolean {
    if (!session || !session.expiresAt || !session.isActive) {
      return false;
    }

    const now = Date.now();
    const isExpired = now >= session.expiresAt;
    const isOldActivity = now - session.lastActivity > (this.config.timeoutMinutes * 60 * 1000);

    return !isExpired && !isOldActivity;
  }

  private async getAllSessions(): Promise<SessionInfo[]> {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to get all sessions:', error);
      return [];
    }
  }
}