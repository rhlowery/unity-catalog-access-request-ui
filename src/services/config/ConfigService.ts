import { SecretsService as GlobalSecretsService } from '../secrets/SecretsService';

export const SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'key', 'credential', 'access_key'
];

export const sanitizeConfig = (config: any) => {
    if (!config) return {};
    const sanitized = { ...config };
    Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk)) && !lowerKey.includes('path') && !lowerKey.includes('source') && !lowerKey.includes('v1')) {
            if (sanitized[key] && typeof sanitized[key] === 'string' && sanitized[key].length > 0) {
                sanitized[key] = '********';
            }
        }
    });
    return sanitized;
};

export const ConfigService = {
    loadConfig: (key: string) => {
        return localStorage.getItem(key);
    },
    saveConfig: (key: string, value: string) => {
        localStorage.setItem(key, value);
    },
    updateConfig: (config: any) => {
        localStorage.setItem('uc_config', JSON.stringify(config));
    },
    getConfig: () => {
        const config = localStorage.getItem('uc_config');
        const parsed = config ? JSON.parse(config) : {};
        return parsed; // Return raw config for internal use
    },
    getSanitizedConfig: () => {
        return sanitizeConfig(ConfigService.getConfig());
    },
    getResolvedConfig: async () => {
        const config = ConfigService.getConfig();
        return await GlobalSecretsService.resolveConfig(config);
    }
};
