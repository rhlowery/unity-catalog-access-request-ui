import type { AuditEntry } from './AuditTypes';
import { AuditIntegrityManager } from './AuditIntegrityManager2';
import { SecureAuditStorage } from './SecureAuditStorage';
import { EventBus } from '../EventBus';

export interface TamperDetectionConfig {
  enableRealTimeMonitoring: boolean;
  checkIntervalMs: number;
  alertThreshold: number; // Number of violations before alert
  autoQuarantine: boolean;
}

export interface TamperDetectionResult {
  isTampered: boolean;
  tamperedEntries: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  firstTamperedAt?: number;
  violations: TamperViolation[];
}

export interface TamperViolation {
  type: 'HASH_CHAIN_BREAK' | 'SIGNATURE_INVALID' | 'ENTRY_MISSING' | 'STORAGE_MODIFIED';
  entryId: string;
  expectedValue: string;
  actualValue: string;
  timestamp: number;
}

class AuditTamperDetector {
  private config: TamperDetectionConfig;
  private integrityManager: AuditIntegrityManager;
  private auditStorage: SecureAuditStorage;
  private monitoringInterval: number | null = null;
  private lastKnownGoodHash: string | null = null;

  constructor(config: Partial<TamperDetectionConfig> = {}) {
    this.config = {
      enableRealTimeMonitoring: true,
      checkIntervalMs: 30000, // 30 seconds
      alertThreshold: 3,
      autoQuarantine: true,
      ...config
    };

    this.integrityManager = new AuditIntegrityManager();
    this.auditStorage = new SecureAuditStorage();
    
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
      this.setupEventListeners();
      this.initializeBaseline();
    }
  }

  private startRealTimeMonitoring(): void {
    this.monitoringInterval = window.setInterval(async () => {
      await this.performIntegrityCheck();
    }, this.config.checkIntervalMs);

    console.log('[TamperDetector] Real-time monitoring started');
  }

  private stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private setupEventListeners(): void {
    // Listen for audit events to verify integrity in real-time
    window.addEventListener('auditEvent', (event: CustomEvent) => {
      const auditEntry = event.detail;
      this.verifyEntryIntegrity(auditEntry);
    });

    // Listen for storage changes
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'acs_audit_log') {
        setTimeout(async () => {
          await this.performIntegrityCheck();
        }, 1000); // Small delay to ensure storage is updated
      }
    });

    console.log('[TamperDetector] Event listeners set up');
  }

  private async initializeBaseline(): Promise<void> {
    try {
      const entries = await this.auditStorage.getEntries(10);
      if (entries.length > 0) {
        // Calculate baseline hash of most recent entries
        const baselineData = entries
          .slice(-5)
          .map(e => `${e.id}:${e.hash}:${e.signature}`)
          .join('|');
        
        this.lastKnownGoodHash = this.simpleHash(baselineData);
        console.log('[TamperDetector] Baseline established');
      }
    } catch (error) {
      console.error('[TamperDetector] Failed to initialize baseline:', error);
    }
  }

  private async performIntegrityCheck(): Promise<TamperDetectionResult> {
    try {
      const entries = await this.auditStorage.getEntries(100);
      const violations: TamperViolation[] = [];

      // Check hash chain integrity
      for (let i = 1; i < entries.length; i++) {
        const current = entries[i];
        const previous = entries[i - 1];

        if (this.config.enableRealTimeMonitoring && current.previousHash !== previous.hash) {
          violations.push({
            type: 'HASH_CHAIN_BREAK',
            entryId: current.id,
            expectedValue: previous.hash,
            actualValue: current.previousHash || 'MISSING',
            timestamp: Date.now()
          });
        }

        // Verify signature if present
        if (current.signature) {
          const isValid = await this.integrityManager.verifyEntry(current);
          if (!isValid) {
            violations.push({
              type: 'SIGNATURE_INVALID',
              entryId: current.id,
              expectedValue: 'VALID_SIGNATURE',
              actualValue: 'INVALID_SIGNATURE',
              timestamp: Date.now()
            });
          }
        }
      }

      // Check storage integrity
      const storageHash = this.calculateStorageHash(entries);
      if (this.lastKnownGoodHash && storageHash !== this.lastKnownGoodHash) {
        violations.push({
          type: 'STORAGE_MODIFIED',
          entryId: 'STORAGE',
          expectedValue: this.lastKnownGoodHash,
          actualValue: storageHash,
          timestamp: Date.now()
        });
      }

      const isTampered = violations.length > 0;
      const severity = this.calculateSeverity(violations.length);

      const result: TamperDetectionResult = {
        isTampered,
        tamperedEntries: violations.map(v => v.entryId),
        severity,
        violations
      };

      if (isTampered) {
        this.handleTamperingDetection(result);
      }

      return result;
    } catch (error) {
      console.error('[TamperDetector] Integrity check failed:', error);
      return {
        isTampered: false,
        tamperedEntries: [],
        severity: 'LOW',
        violations: []
      };
    }
  }

  private async verifyEntryIntegrity(entry: AuditEntry): Promise<void> {
    try {
      // Quick verification of single entry
      const isValid = await this.integrityManager.verifyEntry(entry);
      
      if (!isValid && entry.signature) {
        const violation: TamperViolation = {
          type: 'SIGNATURE_INVALID',
          entryId: entry.id,
          expectedValue: 'VALID_SIGNATURE',
          actualValue: entry.signature,
          timestamp: Date.now()
        };

        this.handleSingleViolation(violation);
      }
    } catch (error) {
      console.error('[TamperDetector] Failed to verify entry:', error);
    }
  }

  private calculateSeverity(violationCount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (violationCount === 0) return 'LOW';
    if (violationCount <= 2) return 'MEDIUM';
    if (violationCount <= 5) return 'HIGH';
    return 'CRITICAL';
  }

  private handleTamperingDetection(result: TamperDetectionResult): void {
    console.error('[TamperDetector] Tampering detected:', result);

    // Dispatch event for UI
    const event = new CustomEvent('auditTamperingDetected', {
      detail: result
    });
    window.dispatchEvent(event);

    // Send to observability service
    if ((window as any).ObservabilityService) {
      (window as any).ObservabilityService.error('Audit tampering detected', {
        severity: result.severity,
        tamperedEntries: result.tamperedEntries,
        violations: result.violations
      });
    }

    // Auto-quarantine if enabled and severity is high enough
    if (this.config.autoQuarantine && (result.severity === 'HIGH' || result.severity === 'CRITICAL')) {
      this.quarantineAuditLog(result);
    }
  }

  private handleSingleViolation(violation: TamperViolation): void {
    console.warn('[TamperDetector] Single violation detected:', violation);

    const event = new CustomEvent('auditTamperingDetected', {
      detail: {
        isTampered: true,
        tamperedEntries: [violation.entryId],
        severity: 'MEDIUM',
        violations: [violation]
      }
    });
    window.dispatchEvent(event);
  }

  private quarantineAuditLog(result: TamperDetectionResult): void {
    try {
      // Mark audit log as quarantined
      localStorage.setItem('acs_audit_quarantined', JSON.stringify({
        timestamp: Date.now(),
        reason: 'TAMPERING_DETECTED',
        details: result,
        originalEntries: localStorage.getItem('acs_audit_log')
      }));

      // Clear the compromised audit log
      localStorage.removeItem('acs_audit_log');

      console.warn('[TamperDetector] Audit log quarantined due to tampering');
    } catch (error) {
      console.error('[TamperDetector] Failed to quarantine audit log:', error);
    }
  }

  private calculateStorageHash(entries: AuditEntry[]): string {
    const data = entries.map(e => `${e.id}:${e.hash}:${e.signature}`).join('|');
    return this.simpleHash(data);
  }

  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Public methods
  async checkIntegrity(): Promise<TamperDetectionResult> {
    return await this.performIntegrityCheck();
  }

  getQuarantineInfo(): any {
    try {
      return JSON.parse(localStorage.getItem('acs_audit_quarantined') || 'null');
    } catch {
      return null;
    }
  }

  restoreFromQuarantine(): boolean {
    try {
      const quarantineInfo = this.getQuarantineInfo();
      if (quarantineInfo && quarantineInfo.originalEntries) {
        localStorage.setItem('acs_audit_log', quarantineInfo.originalEntries);
        localStorage.removeItem('acs_audit_quarantined');
        
        // Re-initialize baseline
        this.initializeBaseline();
        
        console.log('[TamperDetector] Audit log restored from quarantine');
        return true;
      }
    } catch (error) {
      console.error('[TamperDetector] Failed to restore from quarantine:', error);
      return false;
    }
    return false;
  }

  destroy(): void {
    this.stopRealTimeMonitoring();
    console.log('[TamperDetector] Tamper detection stopped');
  }
}

// Create and export instance
const auditTamperDetector = new AuditTamperDetector();
export { auditTamperDetector as AuditTamperDetector };