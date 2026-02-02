export interface SessionInfo {
  id: string;
  userId: string;
  userName: string;
  userGroups: string[];
  provider: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  refreshToken?: string;
  accessToken: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

export interface SessionConfig {
  timeoutMinutes: number;
  renewalThresholdMinutes: number;
  maxSessionsPerUser: number;
  requireReauthForSensitiveOps: boolean;
  enableAuditLogging: boolean;
}

export interface SessionStorage {
  getCurrentSession(): SessionInfo | null;
  createSession(session: SessionInfo): void;
  updateSession(sessionId: string, updates: Partial<SessionInfo>): void;
  deleteSession(sessionId: string): void;
  getActiveSessionsForUser(userId: string): SessionInfo[];
  cleanupExpiredSessions(): void;
  validateSession(sessionId: string): boolean;
}

export interface SessionManager {
  createSession(user: any, provider: string, tokens: any): Promise<SessionInfo>;
  validateSession(sessionId: string): Promise<SessionInfo | null>;
  renewSession(sessionId: string): Promise<SessionInfo | null>;
  destroySession(sessionId: string): Promise<void>;
  checkSessionExpiration(sessionId: string): void;
  trackActivity(sessionId: string): void;
  getActiveSession(): SessionInfo | null;
  logoutAllSessionsForUser(userId: string): Promise<void>;
}