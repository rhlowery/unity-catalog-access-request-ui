// Re-export audit types for external use
export type { AuditEntry, AuditIntegrityConfig, AuditIntegrityService, SecureAuditStorage } from './AuditTypes';
export { AuditIntegrityManager } from './AuditIntegrityManager';
export { SecureAuditStorage as SecureAuditStorageImpl } from './SecureAuditStorage';