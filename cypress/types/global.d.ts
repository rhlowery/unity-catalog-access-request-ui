// Global type declarations for Cypress and Cucumber
declare global {
  namespace Cypress {
    interface Cypress {
      env(): any;
      env(key: string): any;
      env(key: string, value: any): void;
      moment: () => any;
    }
  }

  // Window augmentation for test data
  interface Window {
    sessionData?: any;
    currentUser?: any;
    loginAttempts?: number;
    lockoutUntil?: number;
    lockoutDuration?: number;
    emergencyMode?: boolean;
    emergencyAccess?: any;
    activeSessions?: any[];
    maxSessions?: number;
    loginFromNewDevice?: boolean;
    suspiciousActivity?: any;
    securityEvents?: any[];
    auditEntry?: any;
    auditStorage?: any;
    auditTrail?: any[];
    auditEvents?: any[];
    quarantine?: any;
    hashChainValid?: boolean;
    integrityReport?: any;
    complianceReport?: any;
    performanceMetrics?: any;
    performanceAlerts?: string[];
    securityBreach?: any;
    disasterRecovery?: any;
    incidentResponse?: any;
    backupAvailable?: boolean;
    isOperational?: boolean;
    backupStatus?: any;
    checkSession?: () => void;
    systemMetrics?: any;
    securityMetrics?: any;
    securityAnalytics?: any;
    accessRequest?: any;
    approvalStatus?: string;
    approvalAuditEntry?: any;
    unauthorizedAccessAuditEntry?: any;
    emergencyAuditEntry?: any;
    breakGlassRequest?: any;
    encryptionResponse?: any;
    decryptionResponse?: any;
    currentKeyVersion?: number;
    newKeyVersion?: number;
    tempAccess?: any;
    complianceAuditEnabled?: boolean;
    contentSecurityPolicy?: any;
    cspHeaders?: any;
    approvers?: any[];
  }
}

export {};