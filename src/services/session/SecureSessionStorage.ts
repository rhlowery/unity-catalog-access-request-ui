import { SessionInfo, SessionConfig, SessionStorage } from './SessionTypes';

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

  private hashData(data: string): string {
    // Simple hash implementation - in production, use crypto.subtle
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private encryptSession(session: SessionInfo): string {
    // In production, use proper encryption
    const sessionData = JSON.stringify(session);
    const hashed = this.hashData(sessionData + 'ACS_SESSION_SALT');
    return btoa(sessionData + ':' + hashed);
  }

  private decryptSession(encryptedSession: string): SessionInfo | null {
    try {
      const decoded = atob(encryptedSession);
      const [sessionData, hash] = decoded.split(':');
      
      const expectedHash = this.hashData(sessionData + 'ACS_SESSION_SALT');
      if (hash !== expectedHash) {
        console.warn('[SecureSessionStorage] Session integrity check failed');
        return null;
      }

      return JSON.parse(sessionData) as SessionInfo;
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to decrypt session:', error);
      return null;
    }
  }

  getCurrentSession(): SessionInfo | null {
    try {
      const encrypted = localStorage.getItem(CURRENT_SESSION_KEY);
      if (!encrypted) return null;

      const session = this.decryptSession(encrypted);
      if (!session || !this.validateSessionData(session)) {
        this.deleteSession(session ? session.id : '');
        return null;
      }

      return session;
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to get current session:', error);
      return null;
    }
  }

  createSession(session: SessionInfo): void {
    try {
      // Limit sessions per user
      const existingSessions = this.getActiveSessionsForUser(session.userId);
      if (existingSessions.length >= this.config.maxSessionsPerUser) {
        const oldestSession = existingSessions[0];
        this.deleteSession(oldestSession.id);
      }

      const encrypted = this.encryptSession(session);
      localStorage.setItem(CURRENT_SESSION_KEY, encrypted);

      // Update sessions list
      const sessions = this.getAllSessions();
      sessions.push(session);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

      console.log(`[SecureSessionStorage] Created session ${session.id} for user ${session.userId}`);
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to create session:', error);
    }
  }

  updateSession(sessionId: string, updates: Partial<SessionInfo>): void {
    try {
      const sessions = this.getAllSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

        // Update current session if it's the one being modified
        const currentSession = this.getCurrentSession();
        if (currentSession?.id === sessionId) {
          const updatedSession = sessions[sessionIndex];
          const encrypted = this.encryptSession(updatedSession);
          localStorage.setItem(CURRENT_SESSION_KEY, encrypted);
        }
      }
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to update session:', error);
    }
  }

  deleteSession(sessionId: string): void {
    try {
      // Remove from sessions list
      const sessions = this.getAllSessions().filter(s => s.id !== sessionId);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

      // Remove current session if it matches
      const currentSession = this.getCurrentSession();
      if (currentSession?.id === sessionId) {
        localStorage.removeItem(CURRENT_SESSION_KEY);
      }

      console.log(`[SecureSessionStorage] Deleted session ${sessionId}`);
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to delete session:', error);
    }
  }

  getActiveSessionsForUser(userId: string): SessionInfo[] {
    try {
      const sessions = this.getAllSessions();
      return sessions
        .filter(s => s.userId === userId && s.isActive && this.validateSessionData(s))
        .sort((a, b) => a.lastActivity - b.lastActivity);
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to get sessions for user:', error);
      return [];
    }
  }

  cleanupExpiredSessions(): void {
    try {
      const sessions = this.getAllSessions();
      const activeSessions = sessions.filter(s => this.validateSessionData(s));
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSessions));

      // Clean up current session if expired
      const currentSession = this.getCurrentSession();
      if (currentSession && !this.validateSessionData(currentSession)) {
        this.deleteSession(currentSession.id);
      }
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to cleanup sessions:', error);
    }
  }

  private getSessionById(sessionId: string): SessionInfo | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  validateSession(sessionId: string): boolean {
    const session = this.getSessionById(sessionId);
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

  private getAllSessions(): SessionInfo[] {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[SecureSessionStorage] Failed to get all sessions:', error);
      return [];
    }
  }
}