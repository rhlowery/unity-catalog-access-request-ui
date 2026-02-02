import { EventBus } from './EventBus';
import { AuditIntegrityManager } from './audit/AuditIntegrityManager2';
import { SecureAuditStorage } from './audit/SecureAuditStorage';
import type { AuditEntry } from './audit/AuditTypes';

// Note: OpenTelemetry dependencies are optional for full observability
// This version works without external dependencies for error boundaries

// Configuration (can be overridden via AdminSettings)
let config = {
    enabled: true,
    logLevel: 'INFO', // DEBUG, INFO, WARN, ERROR
    enableAuditIntegrity: true,
    auditRetentionDays: 90
};

// Service identification
const _serviceInfo = {
    name: 'access-control-service-ui',
    version: '1.0.0',
};

// Enhanced metrics storage with audit tracking
const metrics = {
    requests: [],
    errors: [],
    storageOps: [],
    apiCalls: [],
    authAttempts: [],
    auditEvents: [],
    integrityViolations: []
};

// Audit integrity components
let auditIntegrityManager: AuditIntegrityManager | null = null;
let auditStorage: SecureAuditStorage | null = null;

// Initialize audit integrity on load
const initializeAuditIntegrity = () => {
    if (config.enableAuditIntegrity) {
        auditIntegrityManager = new AuditIntegrityManager({
            enableDigitalSignatures: true,
            enableHashChaining: true,
            integrityKey: 'ACS_AUDIT_INTEGRITY_2024'
        });
        
        auditStorage = new SecureAuditStorage();
        
        // Verify existing audit integrity on startup
        verifyAuditIntegrity();
        
        console.log('[Observability] Audit integrity initialized');
    }
};

const verifyAuditIntegrity = async () => {
    if (!auditStorage) return;
    
    try {
        const integrity = await auditStorage.verifyIntegrity();
        
        if (!integrity.valid) {
            console.error('[Observability] Audit integrity issues detected:', integrity.issues);
            
            // Log integrity violations
            integrity.issues.forEach(issue => {
                logIntegrityEvent('AUDIT_INTEGRITY_VIOLATION', {
                    issue,
                    timestamp: Date.now(),
                    severity: 'HIGH'
                });
            });
            
            // Dispatch event for UI notification
            const event = new CustomEvent('auditIntegrityViolation', {
                detail: { issues: integrity.issues }
            });
            window.dispatchEvent(event);
        } else {
            console.log('[Observability] Audit integrity verified successfully');
        }
    } catch (error) {
        console.error('[Observability] Failed to verify audit integrity:', error);
    }
};

// Initialize on load
console.log('[Observability] Enhanced observability with audit integrity initialized');
initializeAuditIntegrity();

// Structured Logger
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const log = (level, message, attributes = {}) => {
    if (!config.enabled) return;
    
    if (LOG_LEVELS[level] < LOG_LEVELS[config.logLevel]) return;

    // Simplified logging without OpenTelemetry
    const span = null; // trace.getActiveSpan();
    const traceId = span?.spanContext?.()?.traceId || 'no-trace';
    const spanId = span?.spanContext?.()?.spanId || 'no-span';

    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        traceId,
        spanId,
        service: _serviceInfo.name,
        version: _serviceInfo.version,
        ...attributes
    };

    // Console logging with proper formatting
    const formattedMessage = `[${logEntry.timestamp}] ${level}: ${message}`;
    
    switch (level) {
        case 'DEBUG':
            console.debug(formattedMessage, logEntry);
            break;
        case 'INFO':
            console.info(formattedMessage, logEntry);
            break;
        case 'WARN':
            console.warn(formattedMessage, logEntry);
            break;
        case 'ERROR':
            console.error(formattedMessage, logEntry);
            // Also store in metrics
            metrics.errors.push({
                ...logEntry,
                errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            });
            break;
    }

    // Store in local storage for debugging
    try {
        const stored = localStorage.getItem('acs_observability_logs');
        const logs = stored ? JSON.parse(stored) : [];
        logs.push(logEntry);
        
        // Keep only last 500 logs
        const recentLogs = logs.slice(-500);
        localStorage.setItem('acs_observability_logs', JSON.stringify(recentLogs));
    } catch (storageError) {
        console.warn('Failed to store log in localStorage:', storageError);
    }
};

// Audit-specific logging with integrity
const logAuditEvent = async (type: string, actor: string, action: string, target: string, details: any = {}) => {
    if (!config.enabled || !auditIntegrityManager || !auditStorage) return;

    try {
        const auditEntry: AuditEntry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now(),
            type,
            actor,
            action,
            target,
            details
        };

        // Add integrity features
        const signedEntry = auditIntegrityManager.getSignedEntry(auditEntry);
        
        // Chain with previous entry
        const previousEntries = await auditStorage.getEntries(1);
        const previousEntry = previousEntries.length > 0 ? previousEntries[0] : null;
        auditIntegrityManager.chainEntries(previousEntry, signedEntry);
        
        // Store the signed entry
        await auditStorage.storeEntry(signedEntry);
        
        // Add to metrics
        metrics.auditEvents.push({
            ...signedEntry,
            loggedAt: Date.now()
        });
        
        console.log(`[Observability] Audit event logged: ${type} by ${actor}`);
        
        // Dispatch audit event for other components
        const event = new CustomEvent('auditEvent', {
            detail: signedEntry
        });
        window.dispatchEvent(event);
        
    } catch (error) {
        console.error('[Observability] Failed to log audit event:', error);
        log('ERROR', 'Audit logging failed', { type, actor, action, error: error.message });
    }
};

const logIntegrityEvent = (type: string, details: any) => {
    metrics.integrityViolations.push({
        type,
        timestamp: Date.now(),
        details
    });
    
    log('WARN', `Integrity Event: ${type}`, details);
};

const logSessionEvent = (type: string, sessionId: string, userId: string, details: any = {}) => {
    logAuditEvent('SESSION', userId, type, sessionId, {
        sessionType: type,
        ...details
    });
};

const logAccessEvent = (type: string, actor: string, resource: string, details: any = {}) => {
    logAuditEvent('ACCESS', actor, type, resource, details);
};

const logApprovalEvent = (type: string, actor: string, requestId: string, decision: string, details: any = {}) => {
    logAuditEvent('APPROVAL', actor, type, requestId, {
        decision,
        ...details
    });
};

// Enhanced ObservabilityService
export const ObservabilityService = {
    // Configuration
    configure(newConfig) {
        config = { ...config, ...newConfig };
        if (newConfig.enableAuditIntegrity !== undefined) {
            initializeAuditIntegrity();
        }
        log('INFO', 'Observability configuration updated', { config: newConfig });
    },

    // Core logging
    debug(message, attributes) {
        log('DEBUG', message, attributes);
    },
    
    info(message, attributes) {
        log('INFO', message, attributes);
    },
    
    warn(message, attributes) {
        log('WARN', message, attributes);
    },
    
    error(message, errorInfo = {}) {
        log('ERROR', message, errorInfo);
    },

    // Audit-specific methods
    async logAccessRequest(actor, resource, permissions, justification) {
        await logAccessEvent('REQUESTED', actor, resource, {
            permissions,
            justification
        });
    },

    async logAccessGranted(actor, resource, permissions) {
        await logAccessEvent('GRANTED', actor, resource, { permissions });
    },

    async logAccessDenied(actor, resource, reason) {
        await logAccessEvent('DENIED', actor, resource, { reason });
    },

    async logApproval(actor, requestId, decision, reason) {
        await logApprovalEvent('DECISION', actor, requestId, decision, { reason });
    },

    async logSessionCreated(sessionId, userId, provider, ipAddress) {
        await logSessionEvent('CREATED', sessionId, userId, {
            provider,
            ipAddress
        });
    },

    async logSessionExpired(sessionId, userId, reason) {
        await logSessionEvent('EXPIRED', sessionId, userId, { reason });
    },

    async logSessionRenewed(sessionId, userId) {
        await logSessionEvent('RENEWED', sessionId, userId);
    },

    // Audit integrity methods
    async verifyAuditIntegrity() {
        return await verifyAuditIntegrity();
    },

    async getAuditEntries(limit) {
        if (!auditStorage) return [];
        return await auditStorage.getEntries(limit);
    },

    async cleanupAuditLogs(daysToKeep) {
        if (!auditStorage) return 0;
        return await auditStorage.cleanupOldEntries(daysToKeep);
    },

    // Metrics and monitoring
    getMetrics() {
        return {
            ...metrics,
            uptime: Date.now() - performance.now(),
            memoryUsage: (performance as any).memory ? {
                used: (performance as any).memory.usedJSHeapSize,
                total: (performance as any).memory.totalJSHeapSize
            } : null
        };
    },

    clearMetrics() {
        Object.keys(metrics).forEach(key => {
            metrics[key] = [];
        });
    },

    // Health check
    async healthCheck() {
        try {
            const integrity = auditStorage ? await auditStorage.verifyIntegrity() : { valid: true, issues: [] };
            const metricCount = Object.values(metrics).reduce((sum, arr) => sum + arr.length, 0);
            
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                integrity,
                metrics: {
                    totalEvents: metricCount,
                    auditEvents: metrics.auditEvents.length,
                    errors: metrics.errors.length,
                    integrityViolations: metrics.integrityViolations.length
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    },

    // Error logging methods for components
    logError(error: Error, errorInfo?: any): string {
        const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.error('Component error', {
            errorId,
            error: error.message,
            stack: error.stack,
            ...errorInfo
        });
        return errorId;
    },

    // Get recent errors for admin panel
    getRecentErrors(limit: number = 50) {
        return metrics.errors.slice(-limit);
    },

    // Clear error log
    clearErrorLog() {
        metrics.errors = [];
        log('INFO', 'Error log cleared');
    }
};