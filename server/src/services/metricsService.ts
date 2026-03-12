import promClient from 'prom-client';

// Initialize default metrics
promClient.collectDefaultMetrics({ prefix: 'acs_bff_' });

export const apiHitCounter = new promClient.Counter({
    name: 'acs_bff_api_hits_total',
    help: 'Total number of API requests',
    labelNames: ['method', 'route', 'status_code']
});

export const getMetrics = async () => {
    return await promClient.register.metrics();
};

export const getContentType = () => {
    return promClient.register.contentType;
};
