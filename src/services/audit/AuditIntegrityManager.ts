import type { AuditEntry, AuditIntegrityConfig, AuditIntegrityService } from './AuditTypes';
import { WebCrypto } from '../crypto/WebCryptoService';

const DEFAULT_CONFIG: AuditIntegrityConfig = {
  enableDigitalSignatures: true,
  enableHashChaining: true,
  signatureAlgorithm: 'AES-GCM', // Using authenticated encryption as a signature surrogate
  hashAlgorithm: 'SHA-256',
  integrityKey: import.meta.env.VITE_AUDIT_INTEGRITY_KEY || 'ACS_DEFAULT_INTEGRITY_KEY'
};

export class AuditIntegrityManager implements AuditIntegrityService {
  private config: AuditIntegrityConfig;

  constructor(config: Partial<AuditIntegrityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async signEntry(entry: AuditEntry): Promise<string> {
    if (!this.config.enableDigitalSignatures) {
      return '';
    }

    try {
      const signatureData = this.getSignatureData(entry);
      // We use WebCrypto.encrypt with the integrity key as a robust alternative to custom hashing.
      // AES-GCM provides both confidentiality and integrity (authenticity).
      return await WebCrypto.encrypt(signatureData, this.config.integrityKey);
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
      const decrypted = await WebCrypto.decrypt(entry.signature, this.config.integrityKey);
      const expectedData = this.getSignatureData(entry);
      return decrypted === expectedData;
    } catch (error) {
      console.warn('[AuditIntegrity] Signature verification failed (possibly tampered or key mismatch)');
      return false;
    }
  }

  async calculateHash(entry: AuditEntry): Promise<string> {
    if (!this.config.enableHashChaining) {
      return '';
    }

    try {
      const hashData = this.getHashData(entry);
      return await WebCrypto.generateHash(hashData, this.config.hashAlgorithm);
    } catch (error) {
      console.error('[AuditIntegrity] Failed to calculate hash:', error);
      return '';
    }
  }

  async chainEntries(previousEntry: AuditEntry | null, currentEntry: AuditEntry): Promise<void> {
    if (!this.config.enableHashChaining) {
      return;
    }

    if (previousEntry) {
      currentEntry.previousHash = previousEntry.hash;
    }

    currentEntry.hash = await this.calculateHash(currentEntry);
  }

  async detectTampering(entries: AuditEntry[]): Promise<{ tampered: boolean; tamperedEntries: string[] }> {
    const tamperedEntries: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify individual entry signature if present
      if (this.config.enableDigitalSignatures && entry.signature) {
        const isValid = await this.verifyEntry(entry);
        if (!isValid) {
          tamperedEntries.push(entry.id);
          continue;
        }
      }

      // Verify hash chain
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

  async getSignedEntry(entry: AuditEntry): Promise<AuditEntry> {
    const signedEntry = { ...entry };

    if (this.config.enableHashChaining) {
      signedEntry.hash = await this.calculateHash(signedEntry);
    }

    if (this.config.enableDigitalSignatures) {
      signedEntry.signature = await this.signEntry(signedEntry);
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
    return [
      entry.id,
      entry.timestamp,
      entry.type,
      entry.actor,
      entry.action,
      entry.target,
      JSON.stringify(entry.details || {}),
      entry.previousHash || ''
    ].join('|');
  }
}

export type { AuditIntegrityService } from './AuditTypes';
