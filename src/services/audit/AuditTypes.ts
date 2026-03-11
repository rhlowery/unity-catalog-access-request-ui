export interface AuditEntry {
  id: string;
  timestamp: number;
  type: string;
  actor: string;
  action: string;
  target: string;
  details: any;
  signature?: string;
  previousHash?: string;
  hash?: string;
}

export interface AuditIntegrityConfig {
  enableDigitalSignatures: boolean;
  enableHashChaining: boolean;
  signatureAlgorithm: string;
  hashAlgorithm: string;
  integrityKey: string;
}

export interface AuditIntegrityService {
  signEntry(entry: AuditEntry): Promise<string>;
  verifyEntry(entry: AuditEntry): Promise<boolean>;
  calculateHash(entry: AuditEntry): Promise<string>;
  chainEntries(previousEntry: AuditEntry | null, currentEntry: AuditEntry): Promise<void>;
  detectTampering(entries: AuditEntry[]): Promise<{ tampered: boolean; tamperedEntries: string[] }>;
  getSignedEntry(entry: AuditEntry): Promise<AuditEntry>;
}



export interface SecureAuditStorage {
  storeEntry(entry: AuditEntry): Promise<void>;
  getEntries(limit?: number): Promise<AuditEntry[]>;
  verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }>;
  cleanupOldEntries(daysToKeep: number): Promise<number>;
}

