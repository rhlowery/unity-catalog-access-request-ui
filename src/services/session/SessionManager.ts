import type { SessionInfo, SessionConfig, SessionManager as ISessionManager, SessionStorage } from './SessionTypes';
import { SecureSessionStorage } from './SecureSessionStorage';
import { generateSecureId } from '../../utils/crypto';

let globalCleanupInterval: ReturnType<typeof setInterval> | null = null;
let intervalRefCount = 0;

export class SessionManagerService implements ISessionManager {
  private storage: SessionStorage;
  private config: SessionConfig;
  private activityTracker: Map<string, () => void> = new Map();
  private renewalTracker: Map<string, number> = new Map();
  private renewalMutex: Map<string, Promise<SessionInfo | null>> = new Map();

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      timeoutMinutes: 480, // 8 hours
      renewalThresholdMinutes: 60, // Renew when 1 hour left
      maxSessionsPerUser: 3,
      requireReauthForSensitiveOps: true,
      enableAuditLogging: true,
      ...config
    };

    this.storage = new SecureSessionStorage(this.config);
    intervalRefCount++;
    if (intervalRefCount === 1) {
      this.startPeriodicCleanup();
    }
  }

  /**
   * Creates a new session for an authenticated user.
   *
   * @param {any} user - User metadata from the identity provider.
   * @param {string} provider - The ID of the identity provider used.
   * @param {any} tokens - Authentication tokens containing access and optional refresh tokens.
   * @returns {Promise<SessionInfo>} Information about the newly created session.
   */
  async createSession(user: any, provider: string, tokens: any): Promise<SessionInfo> {
    const now = Date.now();
    const sessionId = generateSecureId();

    const session: SessionInfo = {
      id: sessionId,
      userId: user.id,
      userName: user.name,
      userGroups: user.groups || [],
      provider,
      createdAt: now,
      expiresAt: now + (this.config.timeoutMinutes * 60 * 1000),
      lastActivity: now,
      accessToken: tokens.accessToken || tokens.token,
      refreshToken: tokens.refreshToken,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      isActive: true
    };

    await this.storage.createSession(session);
    this.setupActivityTracking(sessionId);
    await this.setupRenewalTracking(sessionId);

    if (this.config.enableAuditLogging) {
      console.log(`[SessionManager] Session created for user ${user.id} (${user.name})`);
    }

    return session;
  }

  /**
   * Validates a session by checking both local storage boundaries and the BFF backend validation endpoint.
   * If local or BFF validation fails, the local session is destroyed.
   *
   * @param {string} sessionId - The session ID to validate.
   * @returns {Promise<SessionInfo | null>} The active session if valid, otherwise null.
   */
  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    if (!(await this.storage.validateSession(sessionId))) {
      await this.destroySession(sessionId);
      return null;
    }

    // Bridge with BFF to ensure server-side token is still valid
    try {
      const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
      const response = await fetch(`${BFF_URL}/api/session/validate`, {
        credentials: 'include'
      });
      if (response.status === 401 || response.status === 403) {
        console.warn('[SessionManager] BFF session validation failed. Destroying local session.');
        await this.destroySession(sessionId);
        return null;
      }
    } catch (e) {
      console.warn('[SessionManager] Could not reach BFF for session validation:', e);
    }

    await this.trackActivity(sessionId);
    return session;
  }

  async renewSession(sessionId: string): Promise<SessionInfo | null> {
    const existingRenewal = this.renewalMutex.get(sessionId);
    if (existingRenewal) {
      return existingRenewal;
    }

    const session = await this.getSession(sessionId);

    if (!session || !session.refreshToken) {
      return null;
    }

    const renewalPromise = this.performRenewal(sessionId, session);
    this.renewalMutex.set(sessionId, renewalPromise);

    try {
      return await renewalPromise;
    } finally {
      this.renewalMutex.delete(sessionId);
    }
  }

  private async performRenewal(sessionId: string, session: SessionInfo): Promise<SessionInfo | null> {
    try {
      const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
      const response = await fetch(`${BFF_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const renewedSession: SessionInfo = {
          ...session,
          expiresAt: data.expiresAt || (Date.now() + (this.config.timeoutMinutes * 60 * 1000)),
          lastActivity: Date.now(),
          accessToken: data.token || `renewed_${Date.now()}`,
        };

        await this.storage.updateSession(sessionId, renewedSession);
        await this.setupRenewalTracking(sessionId);

        if (this.config.enableAuditLogging) {
          console.log(`[SessionManager] Session renewed via BFF for ${session.userName}`);
        }

        return renewedSession;
      } else {
        console.warn('[SessionManager] BFF refresh failed, attempting local renewal');
        throw new Error('BFF refresh failed');
      }
    } catch (error) {
      console.error('[SessionManager] Failed to renew session:', error);
      await this.destroySession(sessionId);
      return null;
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    this.clearActivityTracking(sessionId);
    this.clearRenewalTracking(sessionId);

    const session = await this.getSession(sessionId);
    await this.storage.deleteSession(sessionId);

    if (this.config.enableAuditLogging && session) {
      console.log(`[SessionManager] Session destroyed for ${session.userName}`);
    }
  }

  async checkSessionExpiration(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return;
    }

    const timeUntilExpiry = session.expiresAt - Date.now();
    const renewalThreshold = this.config.renewalThresholdMinutes * 60 * 1000;

    if (timeUntilExpiry <= renewalThreshold && timeUntilExpiry > 0) {
      // Show renewal warning
      this.notifySessionExpiring(session, timeUntilExpiry);
    } else if (timeUntilExpiry <= 0) {
      // Session expired
      this.notifySessionExpired(session);
      await this.destroySession(sessionId);
    }
  }

  async trackActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.storage.updateSession(sessionId, { lastActivity: Date.now() });
    }
  }

  async getActiveSession(): Promise<SessionInfo | null> {
    return await this.storage.getCurrentSession();
  }

  async logoutAllSessionsForUser(userId: string): Promise<void> {
    const sessions = await this.storage.getActiveSessionsForUser(userId);

    for (const session of sessions) {
      await this.destroySession(session.id);
    }

    if (this.config.enableAuditLogging) {
      console.log(`[SessionManager] All sessions logged out for user ${userId}`);
    }
  }

  private async getSession(sessionId: string): Promise<SessionInfo | null> {
    const sessions = await this.storage.getActiveSessionsForUser('');
    return sessions.find(s => s.id === sessionId) || null;
  }

  private setupActivityTracking(sessionId: string): void {
    // Track user activity to prevent session timeout
    const activityHandler = async () => {
      await this.trackActivity(sessionId);
    };

    // Listen for various user activities
    document.addEventListener('mousemove', activityHandler, { passive: true });
    document.addEventListener('keydown', activityHandler, { passive: true });
    document.addEventListener('scroll', activityHandler, { passive: true });
    document.addEventListener('click', activityHandler, { passive: true });

    // Store cleanup function
    this.activityTracker.set(sessionId, () => {
      document.removeEventListener('mousemove', activityHandler);
      document.removeEventListener('keydown', activityHandler);
      document.removeEventListener('scroll', activityHandler);
      document.removeEventListener('click', activityHandler);
    });
  }

  private clearActivityTracking(sessionId: string): void {
    const cleanup = this.activityTracker.get(sessionId);
    if (cleanup) {
      cleanup();
      this.activityTracker.delete(sessionId);
    }
  }

  private async setupRenewalTracking(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const timeUntilExpiry = session.expiresAt - Date.now();
    const renewalTime = timeUntilExpiry - (this.config.renewalThresholdMinutes * 60 * 1000);

    if (renewalTime > 0) {
      const timeout = setTimeout(async () => {
        await this.renewSession(sessionId);
      }, renewalTime);

      this.renewalTracker.set(sessionId, (timeout as unknown) as number);
    }
  }

  private clearRenewalTracking(sessionId: string): void {
    const timeout = this.renewalTracker.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.renewalTracker.delete(sessionId);
    }
  }

  private startPeriodicCleanup(): void {
    if (globalCleanupInterval) return;
    globalCleanupInterval = setInterval(async () => {
      await this.storage.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  static cleanup(): void {
    intervalRefCount--;
    if (intervalRefCount <= 0 && globalCleanupInterval) {
      clearInterval(globalCleanupInterval);
      globalCleanupInterval = null;
      intervalRefCount = 0;
    }
  }

  private async getClientIP(): Promise<string | undefined> {
    return undefined;
  }

  private notifySessionExpiring(session: SessionInfo, timeUntilExpiry: number): void {
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (60 * 1000));

    // Dispatch custom event for UI components to listen to
    const event = new CustomEvent('sessionExpiring', {
      detail: {
        session,
        minutesUntilExpiry,
        message: `Your session will expire in ${minutesUntilExpiry} minutes`
      }
    });
    window.dispatchEvent(event);

    console.warn(`[SessionManager] Session expiring in ${minutesUntilExpiry} minutes for ${session.userName}`);
  }

  private notifySessionExpired(session: SessionInfo): void {
    const event = new CustomEvent('sessionExpired', {
      detail: {
        session,
        message: 'Your session has expired. Please log in again.'
      }
    });
    window.dispatchEvent(event);

    console.warn(`[SessionManager] Session expired for ${session.userName}`);
  }
}

// Singleton instance
export const SessionManager = new SessionManagerService();