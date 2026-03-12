export interface SessionInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  userGroups: string[];
  userPermissions: string[];
  provider: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  refreshToken?: string;
  accessToken?: string;
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
  getCurrentSession(): Promise<SessionInfo | null>;
  createSession(session: SessionInfo): Promise<void>;
  updateSession(sessionId: string, updates: Partial<SessionInfo>): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getActiveSessionsForUser(userId: string): Promise<SessionInfo[]>;
  cleanupExpiredSessions(): Promise<void>;
  validateSession(sessionId: string): Promise<boolean>;
}

export interface SessionManager {
  createSession(user: any, provider: string, tokens: any): Promise<SessionInfo>;
  validateSession(sessionId: string): Promise<SessionInfo | null>;
  renewSession(sessionId: string): Promise<SessionInfo | null>;
  destroySession(sessionId: string): Promise<void>;
  checkSessionExpiration(sessionId: string): Promise<void>;
  trackActivity(sessionId: string): Promise<void>;
  getActiveSession(): Promise<SessionInfo | null>;
  logoutAllSessionsForUser(userId: string): Promise<void>;
}