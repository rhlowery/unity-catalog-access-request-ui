/**
 * ObservabilityService - Simplified Error Logging and Monitoring
 * 
 * Provides:
 * - Error logging with unique IDs
 * - Local storage based error tracking
 * - Basic metrics without external dependencies
 * - Development-friendly debugging tools
 */

// Note: OpenTelemetry dependencies are optional for full observability
// This version works without external dependencies for error boundaries

// Configuration (can be overridden via AdminSettings)
let config = {
    enabled: true,
    logLevel: 'INFO' // DEBUG, INFO, WARN, ERROR
};

// Service identification
const _serviceInfo = {
    name: 'access-control-service-ui',
    version: '1.0.0',
};

// Simple metrics storage
const metrics = {
    requests: [],
    errors: [],
    storageOps: [],
    apiCalls: [],
    authAttempts: []
};

// Initialize on load
console.log('[Observability] Basic error logging initialized');

    // Structured Logger
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const log = (level, message, attributes = {}) => {
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
        ...attributes,
    };

    const logFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    logFn(JSON.stringify(logEntry));
};

export const ObservabilityService = {
    // Update configuration
    updateConfig(newConfig) {
        config = { ...config, ...newConfig };
    },

    getConfig() {
        return config;
    },

    // Simplified metrics recording
    recordRequest(status) {
        metrics.requests.push({
            timestamp: new Date().toISOString(),
            status
        });
        this._trimMetrics('requests');
    },

    recordApprovalLatency(durationMs, decision) {
        // Store in requests for simplicity
        this.recordRequest(`approval_${decision}_${durationMs}ms`);
    },

    recordStorageOp(adapter, operation) {
        metrics.storageOps.push({
            timestamp: new Date().toISOString(),
            adapter,
            operation
        });
        this._trimMetrics('storageOps');
    },

    recordApiCall(endpoint, status) {
        metrics.apiCalls.push({
            timestamp: new Date().toISOString(),
            endpoint,
            status
        });
        this._trimMetrics('apiCalls');
    },

    recordAuth(provider, success) {
        metrics.authAttempts.push({
            timestamp: new Date().toISOString(),
            provider,
            success
        });
        this._trimMetrics('authAttempts');
    },

    // Helper to keep metrics arrays bounded
    _trimMetrics(metricType) {
        if (metrics[metricType].length > 100) {
            metrics[metricType] = metrics[metricType].slice(-50);
        }
    },

    // Get metrics for debugging
    getMetrics() {
        return { ...metrics };
    },

    // Record errors (simplified metrics)
    recordError(type, attributes = {}) {
        metrics.errors.push({
            timestamp: new Date().toISOString(),
            type,
            ...attributes
        });
        this._trimMetrics('errors');
    },

    // Logging
    debug(message, attributes) {
        log('DEBUG', message, attributes);
    },

    info(message, attributes) {
        log('INFO', message, attributes);
    },

    warn(message, attributes) {
        log('WARN', message, attributes);
    },

    error(message, attributes) {
        log('ERROR', message, attributes);
    },

    // Error logging for ErrorBoundary
    logError(error, errorInfo) {
        const errorId = this.generateErrorId();
        
        // Log structured error
        this.error('React Error Boundary caught error', {
            errorId,
            errorMessage: error.message,
            errorStack: error.stack,
            componentStack: errorInfo?.componentStack,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });

        // Record error metric
        this.recordError('react_error_boundary', {
            errorId,
            errorName: error.name
        });

        // Store error details locally for debugging
        try {
            const errorLog = JSON.parse(localStorage.getItem('acs_error_log') || '[]');
            errorLog.push({
                id: errorId,
                timestamp: new Date().toISOString(),
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                },
                componentStack: errorInfo?.componentStack,
                userAgent: navigator.userAgent,
                url: window.location.href
            });
            
            // Keep only last 50 errors
            if (errorLog.length > 50) {
                errorLog.splice(0, errorLog.length - 50);
            }
            
            localStorage.setItem('acs_error_log', JSON.stringify(errorLog));
        } catch (e) {
            console.warn('Failed to store error log:', e);
        }

        return errorId;
    },

    // Generate unique error ID
    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Get recent errors for debugging
    getRecentErrors(limit = 10) {
        try {
            const errorLog = JSON.parse(localStorage.getItem('acs_error_log') || '[]');
            return errorLog.slice(-limit);
        } catch (e) {
            console.warn('Failed to retrieve error log:', e);
            return [];
        }
    },

    // Clear error log
    clearErrorLog() {
        try {
            localStorage.removeItem('acs_error_log');
            return true;
        } catch (e) {
            console.warn('Failed to clear error log:', e);
            return false;
        }
    },
};
