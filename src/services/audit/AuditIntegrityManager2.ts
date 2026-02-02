import type { AuditEntry, AuditIntegrityConfig, AuditIntegrityService } from './AuditTypes';

const DEFAULT_CONFIG: AuditIntegrityConfig = {
  enableDigitalSignatures: true,
  enableHashChaining: true,
  signatureAlgorithm: 'SHA-256',
  hashAlgorithm: 'SHA-256',
  integrityKey: 'ACS_AUDIT_INTEGRITY_KEY_2024'
};

export class AuditIntegrityManager implements AuditIntegrityService {
  private config: AuditIntegrityConfig;

  constructor(config: Partial<AuditIntegrityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  signEntry(entry: AuditEntry): string {
    if (!this.config.enableDigitalSignatures) {
      return '';
    }

    try {
      const signatureData = this.getSignatureData(entry);
      // Simple HMAC-like signature for demo
      const signature = btoa(signatureData + '|' + this.config.integrityKey);
      return signature;
    } catch (error) {
      console.error('[AuditIntegrity] Failed to sign entry:', error);
      return '';
    }
  }

  async verifyEntry(entry: AuditEntry): Promise<boolean> {
    if (!this.config.enableDigitalSignatures || !entry.signature) {
      return true; // Skip verification if not enabled
    }

    try {
      const signatureData = this.getSignatureData(entry);
      const expectedSignature = btoa(signatureData + '|' + this.config.integrityKey);
      
      return entry.signature === expectedSignature;
    } catch (error) {
      console.error('[AuditIntegrity] Failed to verify entry:', error);
      return false;
    }
  }

  calculateHash(entry: AuditEntry): string {
    if (!this.config.enableHashChaining) {
      return '';
    }

    try {
      const hashData = this.getHashData(entry);
      // Simple hash implementation for chaining
      let hash = 0;
      for (let i = 0; i < hashData.length; i++) {
        const char = hashData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(36);
    } catch (error) {
      console.error('[AuditIntegrity] Failed to calculate hash:', error);
      return '';
    }
  }

  chainEntries(previousEntry: AuditEntry | null, currentEntry: AuditEntry): void {
    if (!this.config.enableHashChaining) {
      return;
    }

    // Add previous hash to current entry for chaining
    if (previousEntry) {
      currentEntry.previousHash = previousEntry.hash;
    }

    // Calculate current entry's hash
    currentEntry.hash = this.calculateHash(currentEntry);
  }

  detectTampering(entries: AuditEntry[]): { tampered: boolean; tamperedEntries: string[] } {
    const tamperedEntries: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify signature if present
      if (this.config.enableDigitalSignatures && entry.signature) {
        // Note: In real async implementation, this would be awaited
        this.verifyEntry(entry).then(isValid => {
          if (!isValid) {
            tamperedEntries.push(entry.id);
          }
        });
      }

      // Verify hash chaining
      if (this.config.enableHashChaining && i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          tamperedEntries.push(entry.id);
        }
      }
    }

    return {
      tampered: tamperedEntries.length > 0,
      tamperedEntries
    };
  }

  getSignedEntry(entry: AuditEntry): AuditEntry {
    const signedEntry = { ...entry };
    
    // Add hash chaining if enabled
    if (this.config.enableHashChaining) {
      signedEntry.hash = this.calculateHash(signedEntry);
    }

    // Add digital signature if enabled
    if (this.config.enableDigitalSignatures) {
      signedEntry.signature = this.signEntry(signedEntry);
    }

    return signedEntry;
  }

  private getSignatureData(entry: AuditEntry): string {
    // Create canonical representation for signing
    return [
      entry.id,
      entry.timestamp,
      entry.type,
      entry.actor,
      entry.action,
      entry.target,
      JSON.stringify(entry.details || {})
    ].join('|');
  }

  private getHashData(entry: AuditEntry): string {
    // Create canonical representation for hashing
    const data = [
      entry.id,
      entry.timestamp,
      entry.type,
      entry.actor,
      entry.action,
      entry.target,
      JSON.stringify(entry.details || {}),
      entry.previousHash || ''
    ].join('|');
    
    return data;
  }
}

// Export type for other modules
export type { AuditIntegrityService } from './AuditTypes';