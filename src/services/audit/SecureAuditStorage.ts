import type { AuditEntry, SecureAuditStorage as ISecureAuditStorage } from './AuditTypes';
import type { AuditIntegrityService } from './AuditIntegrityManager';

// Simple ID generator
const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export class SecureAuditStorage implements ISecureAuditStorage {
  private storageKey = 'acs_audit_log';
  private integrityKey = 'acs_audit_integrity';
  private maxEntries = 10000; // Limit storage size

  async storeEntry(entry: AuditEntry): Promise<void> {
    try {
      const entries = await this.getEntries();
      
      // Add new entry with timestamp
      const newEntry = {
        ...entry,
        id: entry.id || generateId(),
        timestamp: entry.timestamp || Date.now()
      };

      entries.push(newEntry);

      // Maintain maximum entries limit
      if (entries.length > this.maxEntries) {
        entries.splice(0, entries.length - this.maxEntries);
      }

      // Store in localStorage with compression
      const compressed = this.compressEntries(entries);
      localStorage.setItem(this.storageKey, compressed);

      console.log(`[SecureAuditStorage] Stored audit entry: ${newEntry.type} by ${newEntry.actor}`);
    } catch (error) {
      console.error('[SecureAuditStorage] Failed to store entry:', error);
    }
  }

  async getEntries(limit?: number): Promise<AuditEntry[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const entries = this.decompressEntries(stored);
      
      // Return most recent entries first
      const sorted = entries.sort((a, b) => b.timestamp - a.timestamp);
      
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.error('[SecureAuditStorage] Failed to get entries:', error);
      return [];
    }
  }

  async verifyIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    try {
      const entries = await this.getEntries();
      const issues: string[] = [];

      // Check for missing hashes in chain
      for (let i = 1; i < entries.length; i++) {
        const current = entries[i];
        const previous = entries[i - 1];

        if (current.previousHash && previous.hash !== current.previousHash) {
          issues.push(`Hash chain broken between entries ${previous.id} and ${current.id}`);
        }
      }

      // Check for missing signatures (if enabled)
      const entriesWithSignatures = entries.filter(e => e.signature);
      if (entriesWithSignatures.length > 0) {
        // In a real implementation, would verify each signature
        console.log(`[SecureAuditStorage] Found ${entriesWithSignatures.length} signed entries`);
      }

      // Check storage integrity
      const storedHash = localStorage.getItem(this.integrityKey);
      const calculatedHash = this.calculateStorageHash(entries);

      if (storedHash && storedHash !== calculatedHash) {
        issues.push('Storage integrity compromised - hash mismatch');
      }

      // Update stored hash
      localStorage.setItem(this.integrityKey, calculatedHash);

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('[SecureAuditStorage] Failed to verify integrity:', error);
      return {
        valid: false,
        issues: ['Integrity verification failed']
      };
    }
  }

  async cleanupOldEntries(daysToKeep: number): Promise<number> {
    try {
      const entries = await this.getEntries();
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      const originalCount = entries.length;
      const filteredEntries = entries.filter(entry => entry.timestamp > cutoffTime);
      
      // Store filtered entries
      const compressed = this.compressEntries(filteredEntries);
      localStorage.setItem(this.storageKey, compressed);

      const removedCount = originalCount - filteredEntries.length;
      console.log(`[SecureAuditStorage] Cleaned up ${removedCount} old audit entries`);

      return removedCount;
    } catch (error) {
      console.error('[SecureAuditStorage] Failed to cleanup entries:', error);
      return 0;
    }
  }

  private compressEntries(entries: AuditEntry[]): string {
    // Simple compression - in production would use proper compression
    return JSON.stringify(entries);
  }

  private decompressEntries(compressed: string): AuditEntry[] {
    try {
      return JSON.parse(compressed);
    } catch {
      return [];
    }
  }

  private calculateStorageHash(entries: AuditEntry[]): string {
    // Calculate hash of all entries for integrity verification
    const data = JSON.stringify(entries.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      hash: e.hash,
      signature: e.signature
    })));

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}