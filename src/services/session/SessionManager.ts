import type { SessionInfo, SessionConfig, SessionManager as ISessionManager, SessionStorage } from './SessionTypes';
import { SecureSessionStorage } from './SecureSessionStorage';

// Simple ID generator
const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export class SessionManagerService implements ISessionManager {
  private storage: SessionStorage;
  private config: SessionConfig;
  private activityTracker: Map<string, () => void> = new Map();
  private renewalTracker: Map<string, number> = new Map();

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
    this.startPeriodicCleanup();
  }

  async createSession(user: any, provider: string, tokens: any): Promise<SessionInfo> {
    const now = Date.now();
    const sessionId = generateId();
    
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

    this.storage.createSession(session);
    this.setupActivityTracking(sessionId);
    this.setupRenewalTracking(sessionId);

    if (this.config.enableAuditLogging) {
      console.log(`[SessionManager] Session created for user ${user.id} (${user.name})`);
    }

    return session;
  }

  async validateSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    if (!this.storage.validateSession(sessionId)) {
      await this.destroySession(sessionId);
      return null;
    }

    this.trackActivity(sessionId);
    return session;
  }

  async renewSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.getSession(sessionId);
    
    if (!session || !session.refreshToken) {
      return null;
    }

    try {
      // In a real implementation, call refresh token endpoint
      const renewedSession: SessionInfo = {
        ...session,
        expiresAt: Date.now() + (this.config.timeoutMinutes * 60 * 1000),
        lastActivity: Date.now(),
        accessToken: `renewed_${Date.now()}` // Mock renewal
      };

      this.storage.updateSession(sessionId, renewedSession);
      this.setupRenewalTracking(sessionId);

      if (this.config.enableAuditLogging) {
        console.log(`[SessionManager] Session renewed for ${session.userName}`);
      }

      return renewedSession;
    } catch (error) {
      console.error('[SessionManager] Failed to renew session:', error);
      await this.destroySession(sessionId);
      return null;
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    this.clearActivityTracking(sessionId);
    this.clearRenewalTracking(sessionId);
    
    const session = this.getSession(sessionId);
    this.storage.deleteSession(sessionId);

    if (this.config.enableAuditLogging && session) {
      console.log(`[SessionManager] Session destroyed for ${session.userName}`);
    }
  }

  checkSessionExpiration(sessionId: string): void {
    const session = this.getSession(sessionId);
    
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
      this.destroySession(sessionId);
    }
  }

  trackActivity(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      this.storage.updateSession(sessionId, { lastActivity: Date.now() });
    }
  }

  getActiveSession(): SessionInfo | null {
    return this.storage.getCurrentSession();
  }

  async logoutAllSessionsForUser(userId: string): Promise<void> {
    const sessions = this.storage.getActiveSessionsForUser(userId);
    
    for (const session of sessions) {
      await this.destroySession(session.id);
    }

    if (this.config.enableAuditLogging) {
      console.log(`[SessionManager] All sessions logged out for user ${userId}`);
    }
  }

  private getSession(sessionId: string): SessionInfo | null {
    const sessions = this.storage.getActiveSessionsForUser('');
    return sessions.find(s => s.id === sessionId) || null;
  }

  private setupActivityTracking(sessionId: string): void {
    // Track user activity to prevent session timeout
    const activityHandler = () => {
      this.trackActivity(sessionId);
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

  private setupRenewalTracking(sessionId: string): void {
    const session = this.getSession(sessionId);
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
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.storage.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  private async getClientIP(): Promise<string | undefined> {
    // In production, this would call a service to get the client IP
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
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