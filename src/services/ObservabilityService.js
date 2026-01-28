/**
 * ObservabilityService - OpenTelemetry Instrumentation
 * 
 * Provides:
 * - Distributed Tracing (OTLP)
 * - Metrics (OTLP)
 * - Structured Logging with Trace Context
 */

import { trace, metrics, context } from '@opentelemetry/api';
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

// Configuration (can be overridden via AdminSettings)
let config = {
    enabled: true,
    tracingEnabled: true,
    metricsEnabled: true,
    otlpEndpoint: 'http://localhost:4318', // Default OTLP HTTP endpoint
    logLevel: 'INFO' // DEBUG, INFO, WARN, ERROR
};

// Resource identifying this service
const resource = {
    attributes: {
        'service.name': 'access-control-service-ui',
        'service.version': '1.0.0',
    }
};

// Initialize Tracer Provider
let tracerProvider = null;
let tracer = null;

const initTracing = () => {
    if (!config.tracingEnabled) return;

    tracerProvider = new WebTracerProvider({ resource });

    const traceExporter = new OTLPTraceExporter({
        url: `${config.otlpEndpoint}/v1/traces`,
    });

    tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
    tracerProvider.register();

    tracer = trace.getTracer('acs-ui-tracer', '1.0.0');
    console.log('[Observability] Tracing initialized');
};

// Initialize Metrics Provider
let meterProvider = null;
let meter = null;

const initMetrics = () => {
    if (!config.metricsEnabled) return;

    const metricExporter = new OTLPMetricExporter({
        url: `${config.otlpEndpoint}/v1/metrics`,
    });

    meterProvider = new MeterProvider({
        resource,
        readers: [new PeriodicExportingMetricReader({ exporter: metricExporter, exportIntervalMillis: 10000 })],
    });

    metrics.setGlobalMeterProvider(meterProvider);
    meter = metrics.getMeter('acs-ui-meter', '1.0.0');
    console.log('[Observability] Metrics initialized');
};

// Metrics Instruments
let requestCounter = null;
let approvalLatency = null;
let storageOpsCounter = null;
let apiCallCounter = null;
let authCounter = null;

const initInstruments = () => {
    if (!meter) return;

    requestCounter = meter.createCounter('access_requests_total', {
        description: 'Total number of access requests',
    });

    approvalLatency = meter.createHistogram('approval_latency_ms', {
        description: 'Time taken to approve/deny requests',
        unit: 'ms',
    });

    storageOpsCounter = meter.createCounter('storage_operations_total', {
        description: 'Total storage operations',
    });

    apiCallCounter = meter.createCounter('api_calls_total', {
        description: 'Total API calls',
    });

    authCounter = meter.createCounter('auth_attempts_total', {
        description: 'Total authentication attempts',
    });
};

// Initialize on load
if (config.enabled) {
    initTracing();
    initMetrics();
    initInstruments();
}

// Structured Logger
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const log = (level, message, attributes = {}) => {
    if (LOG_LEVELS[level] < LOG_LEVELS[config.logLevel]) return;

    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId || 'no-trace';
    const spanId = span?.spanContext().spanId || 'no-span';

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
        // Re-initialize if needed
        if (config.enabled) {
            if (!tracerProvider && config.tracingEnabled) initTracing();
            if (!meterProvider && config.metricsEnabled) {
                initMetrics();
                initInstruments();
            }
        }
    },

    getConfig() {
        return config;
    },

    // Tracing
    startSpan(name, attributes = {}) {
        if (!tracer) return null;
        return tracer.startSpan(name, { attributes });
    },

    endSpan(span) {
        if (span) span.end();
    },

    withSpan(name, fn, attributes = {}) {
        const span = this.startSpan(name, attributes);
        try {
            return context.with(trace.setSpan(context.active(), span), fn);
        } finally {
            this.endSpan(span);
        }
    },

    async withSpanAsync(name, fn, attributes = {}) {
        const span = this.startSpan(name, attributes);
        try {
            return await context.with(trace.setSpan(context.active(), span), fn);
        } finally {
            this.endSpan(span);
        }
    },

    // Metrics
    recordRequest(status) {
        if (requestCounter) requestCounter.add(1, { status });
    },

    recordApprovalLatency(durationMs, decision) {
        if (approvalLatency) approvalLatency.record(durationMs, { decision });
    },

    recordStorageOp(adapter, operation) {
        if (storageOpsCounter) storageOpsCounter.add(1, { adapter, operation });
    },

    recordApiCall(endpoint, status) {
        if (apiCallCounter) apiCallCounter.add(1, { endpoint, status });
    },

    recordAuth(provider, success) {
        if (authCounter) authCounter.add(1, { provider, success: success ? 'true' : 'false' });
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
};
