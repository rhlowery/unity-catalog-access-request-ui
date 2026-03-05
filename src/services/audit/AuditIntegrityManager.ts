import type { AuditEntry, AuditIntegrityConfig, AuditIntegrityService } from './AuditTypes';

const DEFAULT_CONFIG: AuditIntegrityConfig = {
  enableDigitalSignatures: true,
  enableHashChaining: true,
  signatureAlgorithm: 'SHA-256',
  hashAlgorithm: 'SHA-256',
  integrityKey: import.meta.env.VITE_AUDIT_INTEGRITY_KEY || 'ACS_DEFAULT_INTEGRITY_KEY'
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
      const key = this.config.integrityKey;
      
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      const msgData = encoder.encode(signatureData);
      
      let hash = 0;
      for (let i = 0; i < msgData.length; i++) {
        hash = ((hash << 5) - hash) + msgData[i];
        hash = hash & hash;
      }
      for (let i = 0; i < keyData.length; i++) {
        hash = ((hash << 5) - hash) + keyData[i];
        hash = hash & hash;
      }
      
      const combined = signatureData + '|' + hash.toString(16);
      return btoa(combined);
    } catch (error) {
      console.error('[AuditIntegrity] Failed to sign entry:', error);
      return '';
    }
  }

  async verifyEntry(entry: AuditEntry): Promise<boolean> {
    if (!this.config.enableDigitalSignatures || !entry.signature) {
      return true;
    }

    try {
      const expectedSignature = this.signEntry(entry);
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
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(hashData);
      
      let hash = 0;
      for (let i = 0; i < dataBuffer.length; i++) {
        hash = ((hash << 5) - hash) + dataBuffer[i];
        hash = hash & hash;
      }
      
      return hash.toString(16);
    } catch (error) {
      console.error('[AuditIntegrity] Failed to calculate hash:', error);
      return '';
    }
  }

  chainEntries(previousEntry: AuditEntry | null, currentEntry: AuditEntry): void {
    if (!this.config.enableHashChaining) {
      return;
    }

    if (previousEntry) {
      currentEntry.previousHash = previousEntry.hash;
    }

    currentEntry.hash = this.calculateHash(currentEntry);
  }

  detectTampering(entries: AuditEntry[]): { tampered: boolean; tamperedEntries: string[] } {
    const tamperedEntries: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

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
    
    if (this.config.enableHashChaining) {
      signedEntry.hash = this.calculateHash(signedEntry);
    }

    if (this.config.enableDigitalSignatures) {
      signedEntry.signature = this.signEntry(signedEntry);
    }

    return signedEntry;
  }

  private getSignatureData(entry: AuditEntry): string {
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

export type { AuditIntegrityService } from './AuditTypes';
